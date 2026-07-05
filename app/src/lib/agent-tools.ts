import type Anthropic from '@anthropic-ai/sdk'
import { IS_MOCK, MockDB } from './mock-store'
import { connectDb } from './db'
import { ScheduleSlot } from '@/models/ScheduleSlot'
import { Appointment } from '@/models/Appointment'
import { Contact } from '@/models/Contact'
import type { ChatTurn } from './ai'

const MAX_TOOL_ROUNDS = 5
const MAX_REPLY_TOKENS = 500

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface ScheduleSlotData {
  _id: string
  workspaceId: string
  className: string
  dayOfWeek: number
  time: string
  durationMin: number
  capacity: number
  booked: number
  instructor: string
}

export interface AppointmentCreateData {
  workspaceId: string
  contactId: string | null
  contactName: string
  className: string
  startsAt: Date
  durationMin: number
  channel: string
  kind: 'trial' | 'regular' | 'consult'
}

export interface ContactToolPatch {
  lifecycleStage?: string
  attentionRequired?: boolean
}

export interface AgentToolStore {
  getSchedule(workspaceId: string): Promise<ScheduleSlotData[]>
  getScheduleSlot(id: string): Promise<ScheduleSlotData | null>
  incrementSlotBooking(id: string): Promise<ScheduleSlotData | null>
  createAppointment(data: AppointmentCreateData): Promise<{ _id: string }>
  updateContact(id: string, patch: ContactToolPatch): Promise<void>
}

export const mockToolStore: AgentToolStore = {
  getSchedule: async (workspaceId) => MockDB.getSchedule(workspaceId),
  getScheduleSlot: async (id) => MockDB.getScheduleSlot(id),
  incrementSlotBooking: async (id) => MockDB.incrementSlotBooking(id),
  createAppointment: async (data) => {
    const appt = MockDB.createAppointment(data)
    return { _id: appt._id }
  },
  updateContact: async (id, patch) => {
    MockDB.updateContact(id, patch)
  },
}

interface LeanSlot {
  _id: unknown
  workspaceId: string
  className: string
  dayOfWeek: number
  time: string
  durationMin: number
  capacity: number
  booked: number
  instructor: string
}

function toSlotData(slot: LeanSlot): ScheduleSlotData {
  return {
    _id: String(slot._id),
    workspaceId: slot.workspaceId,
    className: slot.className,
    dayOfWeek: slot.dayOfWeek,
    time: slot.time,
    durationMin: slot.durationMin,
    capacity: slot.capacity,
    booked: slot.booked,
    instructor: slot.instructor,
  }
}

export const dbToolStore: AgentToolStore = {
  getSchedule: async (workspaceId) => {
    await connectDb()
    const slots = await ScheduleSlot.find({ workspaceId }).lean<LeanSlot[]>()
    return slots.map(toSlotData)
  },
  getScheduleSlot: async (id) => {
    await connectDb()
    const slot = await ScheduleSlot.findById(id).lean<LeanSlot | null>()
    return slot ? toSlotData(slot) : null
  },
  incrementSlotBooking: async (id) => {
    await connectDb()
    const slot = await ScheduleSlot.findById(id).lean<LeanSlot | null>()
    if (!slot || slot.booked >= slot.capacity) return null
    // Conditional update on the previously observed value avoids overbooking races.
    const updated = await ScheduleSlot.findOneAndUpdate(
      { _id: id, booked: slot.booked },
      { $inc: { booked: 1 } },
      { new: true },
    ).lean<LeanSlot | null>()
    return updated ? toSlotData(updated) : null
  },
  createAppointment: async (data) => {
    await connectDb()
    const appt = await Appointment.create(data)
    return { _id: String(appt._id) }
  },
  updateContact: async (id, patch) => {
    await connectDb()
    await Contact.findByIdAndUpdate(id, { $set: patch })
  },
}

function getToolStore(): AgentToolStore {
  return IS_MOCK ? mockToolStore : dbToolStore
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_schedule',
    description:
      'Look up the real class schedule with live availability. Call this before proposing class times or confirming a booking.',
    input_schema: {
      type: 'object',
      properties: {
        class_name: { type: 'string', description: 'Optional filter, e.g. "Morning Flow"' },
      },
    },
  },
  {
    name: 'book_trial',
    description:
      'Book the customer into a class. Only call after the customer has clearly agreed to a specific class and time. This creates a real appointment.',
    input_schema: {
      type: 'object',
      properties: {
        slot_id: { type: 'string', description: 'The slot _id from check_schedule' },
        kind: { type: 'string', enum: ['trial', 'regular', 'consult'], description: 'trial for first-time visitors' },
      },
      required: ['slot_id'],
    },
  },
  {
    name: 'flag_for_human',
    description:
      'Escalate this conversation to a human team member. Use for refunds, complaints, medical questions, payment handling, or anything you cannot resolve.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Short reason for the escalation' },
      },
      required: ['reason'],
    },
  },
]

interface AgentContext {
  workspaceId: string
  contactId: string
  contactName: string
  channel: string
}

export interface AgentResult {
  reply: string
  bookedAppointmentId: string | null
  flaggedForHuman: boolean
}

function nextOccurrence(dayOfWeek: number, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  const delta = (dayOfWeek - date.getDay() + 7) % 7 || 7
  date.setDate(date.getDate() + delta)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function describeSlot(slot: ScheduleSlotData): object {
  return {
    slot_id: slot._id,
    class: slot.className,
    day: DAY_NAMES[slot.dayOfWeek],
    time: slot.time,
    duration_min: slot.durationMin,
    instructor: slot.instructor,
    spots_left: slot.capacity - slot.booked,
    next_date: nextOccurrence(slot.dayOfWeek, slot.time).toDateString(),
  }
}

async function runTool(
  store: AgentToolStore,
  name: string,
  input: Record<string, unknown>,
  ctx: AgentContext,
  result: AgentResult,
): Promise<object> {
  if (name === 'check_schedule') {
    const filter = typeof input.class_name === 'string' ? input.class_name.toLowerCase() : null
    const allSlots = await store.getSchedule(ctx.workspaceId)
    const slots = allSlots
      .filter((s) => !filter || s.className.toLowerCase().includes(filter))
      .map(describeSlot)
    return { schedule: slots }
  }

  if (name === 'book_trial') {
    const slotId = typeof input.slot_id === 'string' ? input.slot_id : ''
    const slot = await store.getScheduleSlot(slotId)
    if (!slot) return { error: 'Unknown slot_id. Call check_schedule first.' }
    const updated = await store.incrementSlotBooking(slotId)
    if (!updated) return { error: 'That class is full. Offer another slot.' }

    const kind = input.kind === 'regular' || input.kind === 'consult' ? input.kind : 'trial'
    const startsAt = nextOccurrence(slot.dayOfWeek, slot.time)
    const appt = await store.createAppointment({
      workspaceId: ctx.workspaceId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      className: kind === 'trial' ? `${slot.className} (Trial)` : slot.className,
      startsAt,
      durationMin: slot.durationMin,
      channel: ctx.channel,
      kind,
    })
    if (kind === 'trial') {
      await store.updateContact(ctx.contactId, { lifecycleStage: 'trial_booked' })
      try {
        const { triggerCampaignsForStage } = await import('./campaign-runner')
        await triggerCampaignsForStage(
          ctx.workspaceId,
          { id: ctx.contactId, name: ctx.contactName, channel: ctx.channel },
          'trial_booked',
        )
      } catch {
        // Campaign auto-fire must never break the booking itself.
      }
    }
    result.bookedAppointmentId = appt._id
    return {
      booked: true,
      class: slot.className,
      day: DAY_NAMES[slot.dayOfWeek],
      time: slot.time,
      date: startsAt.toDateString(),
      instructor: slot.instructor,
    }
  }

  if (name === 'flag_for_human') {
    await store.updateContact(ctx.contactId, { attentionRequired: true })
    result.flaggedForHuman = true
    return { flagged: true, note: 'A team member has been notified and will follow up.' }
  }

  return { error: `Unknown tool: ${name}` }
}

const TOOL_GUIDANCE = `

You have real tools: check_schedule (live availability), book_trial (actually books the class), and flag_for_human (escalates to staff). Always check the schedule before proposing times. When the customer agrees to a slot, book it immediately and confirm with the exact day, date, time, and instructor. Never invent availability.`

/**
 * Tool-using agent loop — checks schedules, books appointments, escalates.
 */
export async function generateAgentReply(
  systemPrompt: string,
  history: ChatTurn[],
  incomingText: string,
  ctx: AgentContext,
): Promise<AgentResult> {
  const { llmChatWithTools } = await import('./llm')
  const store = getToolStore()
  const result: AgentResult = { reply: '', bookedAppointmentId: null, flaggedForHuman: false }

  const toolDefs = TOOLS.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    parameters: t.input_schema as Record<string, unknown>,
  }))

  result.reply = await llmChatWithTools(
    systemPrompt + TOOL_GUIDANCE,
    [...history.slice(-12), { role: 'user', content: incomingText }],
    toolDefs,
    (name, input) => runTool(store, name, input, ctx, result),
    MAX_REPLY_TOKENS,
  )

  return result
}
