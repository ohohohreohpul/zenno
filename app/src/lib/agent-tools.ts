import type Anthropic from '@anthropic-ai/sdk'
import type { DealStage } from '@/models/Deal'
import {
  getScheduleSlots,
  getScheduleSlot,
  bookScheduleSlot,
  updateContact,
  findOpenDealByContact,
  createDeal,
  updateDeal,
} from './queries'
import type { ChatTurn } from './ai'

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

export interface ContactToolPatch {
  lifecycleStage?: string
  attentionRequired?: boolean
  memorySummary?: string
  memoryUpdatedAt?: Date
}

export interface DealCreateData {
  workspaceId: string
  contactId: string | null
  contactName: string
  name: string
  value: number
  currency: string
  stage: DealStage
  channel: string
}

export interface DealPatch {
  stage?: DealStage
  value?: number
  name?: string
}

export interface AgentToolStore {
  getSchedule(workspaceId: string): Promise<ScheduleSlotData[]>
  getScheduleSlot(id: string): Promise<ScheduleSlotData | null>
  bookScheduleSlot(data: { slotId: string; startsAt: Date; contactId: string; contactName: string; channel: string; kind: 'trial' | 'regular' | 'consult' }): Promise<{ _id: string } | null>
  updateContact(id: string, patch: ContactToolPatch): Promise<void>
  getOpenDealForContact(contactId: string): Promise<{ _id: string; stage: DealStage; value: number } | null>
  createDeal(data: DealCreateData): Promise<{ _id: string }>
  updateDeal(id: string, patch: DealPatch): Promise<void>
}

interface LeanSlot {
  id: unknown
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
    _id: String(slot.id),
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
    return (await getScheduleSlots(workspaceId) as unknown as LeanSlot[]).map(toSlotData)
  },
  getScheduleSlot: async (id) => {
    const slot = await getScheduleSlot(id) as unknown as LeanSlot | null
    return slot ? toSlotData(slot) : null
  },
  bookScheduleSlot: async (input) => {
    const appointment = await bookScheduleSlot(input)
    return appointment ? { _id: String((appointment as { id: string }).id) } : null
  },
  updateContact: async (id, patch) => {
    await updateContact(id, patch as unknown as Record<string, unknown>)
  },
  getOpenDealForContact: async (contactId) => {
    const deal = await findOpenDealByContact(contactId)
    return deal ? { _id: String((deal as { id?: string; _id?: string }).id ?? (deal as { _id?: string })._id), stage: deal.stage as DealStage, value: deal.value } : null
  },
  createDeal: async (data) => {
    const deal = await createDeal(data as unknown as Record<string, unknown>)
    return { _id: String((deal as { id: string }).id) }
  },
  updateDeal: async (id, patch) => {
    await updateDeal(id, patch as unknown as Record<string, unknown>)
  },
}

function getToolStore(): AgentToolStore {
  return dbToolStore
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_schedule',
    description:
      'Look up the real class/availability schedule with live availability. Call this before proposing times or confirming a booking.',
    input_schema: {
      type: 'object',
      properties: {
        class_name: { type: 'string', description: 'Optional filter, e.g. "Morning Flow"' },
      },
    },
  },
  {
    name: 'book_appointment',
    description:
      'Book the customer into a class/consult/trial. Only call after the customer has clearly agreed to a specific class and time. This creates a real appointment.',
    input_schema: {
      type: 'object',
      properties: {
        slot_id: { type: 'string', description: 'The slot _id from check_schedule' },
        kind: { type: 'string', enum: ['trial', 'regular', 'consult'], description: 'trial for first-time visitors, consult for paid consultations, regular for returning customers' },
      },
      required: ['slot_id'],
    },
  },
  {
    name: 'create_deal',
    description:
      'Open a sales deal (track money) when a customer is evaluating a paid package, membership, or service — even before they commit. Call this the moment a paid offering enters the conversation so pipeline value is captured.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short deal name, e.g. "Monthly Unlimited" or "10-Class Pack"' },
        value: { type: 'number', description: 'Deal value in the business currency' },
        stage: { type: 'string', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], description: 'lead = just mentioned, proposal = you quoted a price, negotiation = handling objections, won = they agreed to pay' },
      },
      required: ['name', 'value', 'stage'],
    },
  },
  {
    name: 'update_deal',
    description:
      'Update the open deal for this contact — move the stage as the conversation progresses (proposal → negotiation → won) or adjust the value. Call when the customer agrees to pay (stage=won), declines (stage=lost), or you reframe the offer (value/stage).',
    input_schema: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] },
        value: { type: 'number', description: 'Adjusted deal value, if the offer changed' },
        name: { type: 'string', description: 'Adjusted deal name, if the offering changed' },
      },
    },
  },
  {
    name: 'save_memory',
    description:
      'Store an important fact about this contact you will want to remember next time — their budget, objections, preferences, timeline, or anything notable. Use this proactively so future conversations don\'t start from zero.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'A concise 1-3 sentence summary of what to remember about this contact right now (it replaces the prior summary, so include prior context too).' },
      },
      required: ['summary'],
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
  timezone: string
  currency: string
}

export interface AgentResult {
  reply: string
  bookedAppointmentId: string | null
  flaggedForHuman: boolean
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: Number(get('year')), month: Number(get('month')), day: Number(get('day')),
    hour: Number(get('hour')), minute: Number(get('minute')), second: Number(get('second')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  }
}

function zonedDateToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = target
  for (let i = 0; i < 3; i++) {
    const actual = zonedParts(new Date(candidate), timeZone)
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    candidate += target - actualAsUtc
  }
  return new Date(candidate)
}

function nextOccurrence(dayOfWeek: number, time: string, timeZone: string, now = new Date()): Date {
  const [hour, minute] = time.split(':').map(Number)
  const local = zonedParts(now, timeZone)
  let delta = (dayOfWeek - local.weekday + 7) % 7
  if (delta === 0 && hour * 60 + minute <= local.hour * 60 + local.minute) delta = 7
  const targetDay = new Date(Date.UTC(local.year, local.month - 1, local.day + delta))
  return zonedDateToUtc(
    targetDay.getUTCFullYear(), targetDay.getUTCMonth() + 1, targetDay.getUTCDate(), hour, minute, timeZone,
  )
}

function describeSlot(slot: ScheduleSlotData, timeZone: string): object {
  const next = nextOccurrence(slot.dayOfWeek, slot.time, timeZone)
  return {
    slot_id: slot._id,
    class: slot.className,
    day: DAY_NAMES[slot.dayOfWeek],
    time: slot.time,
    duration_min: slot.durationMin,
    instructor: slot.instructor,
    spots_left: slot.capacity - slot.booked,
    next_date: new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'full' }).format(next),
    timezone: timeZone,
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
      .map((slot) => describeSlot(slot, ctx.timezone))
    return { schedule: slots }
  }

  if (name === 'book_appointment' || name === 'book_trial') {
    const slotId = typeof input.slot_id === 'string' ? input.slot_id : ''
    const slot = await store.getScheduleSlot(slotId)
    if (!slot) return { error: 'Unknown slot_id. Call check_schedule first.' }
    const kind = input.kind === 'regular' || input.kind === 'consult' ? input.kind : 'trial'
    const startsAt = nextOccurrence(slot.dayOfWeek, slot.time, ctx.timezone)
    const appt = await store.bookScheduleSlot({
      slotId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      startsAt,
      channel: ctx.channel,
      kind,
    })
    if (!appt) return { error: 'That occurrence is full. Offer another slot.' }
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
      date: new Intl.DateTimeFormat('en-US', { timeZone: ctx.timezone, dateStyle: 'full' }).format(startsAt),
      timezone: ctx.timezone,
      instructor: slot.instructor,
    }
  }

  if (name === 'create_deal') {
    const dealName = typeof input.name === 'string' ? input.name : ''
    const value = typeof input.value === 'number' ? input.value : 0
    const stage = (input.stage as DealStage) ?? 'lead'
    if (!dealName) return { error: 'name is required' }
    const deal = await store.createDeal({
      workspaceId: ctx.workspaceId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      name: dealName,
      value,
      currency: ctx.currency,
      stage,
      channel: ctx.channel,
    })
    return { created: true, deal_id: deal._id, name: dealName, value, currency: ctx.currency, stage }
  }

  if (name === 'update_deal') {
    const open = await store.getOpenDealForContact(ctx.contactId)
    if (!open) return { error: 'No open deal for this contact. Call create_deal first.' }
    const patch: DealPatch = {}
    if (typeof input.stage === 'string') patch.stage = input.stage as DealStage
    if (typeof input.value === 'number') patch.value = input.value
    if (typeof input.name === 'string') patch.name = input.name
    await store.updateDeal(open._id, patch)
    return { updated: true, deal_id: open._id, ...patch }
  }

  if (name === 'save_memory') {
    const summary = typeof input.summary === 'string' ? input.summary : ''
    if (!summary) return { error: 'summary is required' }
    await store.updateContact(ctx.contactId, { memorySummary: summary, memoryUpdatedAt: new Date() })
    return { saved: true }
  }

  if (name === 'flag_for_human') {
    await store.updateContact(ctx.contactId, { attentionRequired: true })
    result.flaggedForHuman = true
    return { flagged: true, note: 'A team member has been notified and will follow up.' }
  }

  return { error: `Unknown tool: ${name}` }
}

const TOOL_GUIDANCE = `

You have real tools to close sales, not just chat:
- check_schedule: live availability. Always call before proposing times.
- book_appointment: actually books the customer in. Call the moment they agree to a specific class/time.
- create_deal: open a sales deal the moment a paid package/membership/service enters the conversation — even if they haven't committed. Captures pipeline value.
- update_deal: move the deal forward as the conversation progresses (proposal → negotiation → won), or mark lost if they decline. Call update_deal with stage="won" when they agree to pay.
- save_memory: proactively save what's worth remembering about this contact (budget, objections, preferences, timeline) so future conversations pick up where this one left off.
- flag_for_human: escalates to staff. Use for refunds, complaints, medical, payments.

Never invent availability — check first. Never leave a paying conversation without a deal on the board. Always confirm bookings with exact day, date, time, and instructor.`

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
    async (name, input) => {
      // A tool failure must never kill the conversation — surface it to the
      // model as a result it can react to (retry, apologize, or escalate).
      try {
        return await runTool(store, name, input, ctx, result)
      } catch (error: unknown) {
        console.error(`[agent-tools] tool "${name}" failed:`, error)
        return { error: 'Tool call failed. Check the schedule again or use flag_for_human.' }
      }
    },
    MAX_REPLY_TOKENS,
  )

  return result
}
