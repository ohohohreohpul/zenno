import { NextRequest, NextResponse } from 'next/server'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { getAppointments, getContacts, getMessages } from '@/lib/queries'
import { hasAiKey } from '@/lib/ai'

const DEFAULT_WORKSPACE_ID = 'ws-1'

interface DigestConversation {
  contactId: string
  name: string
  channel: string
  messageCount: number
  lastMessage: string
}

interface DigestBooking {
  contactName: string
  className: string
  startsAt: Date | string
  kind: string
}

interface DigestData {
  date: string
  conversations_handled: number
  inbound_messages: number
  ai_replies: number
  bookings_created: DigestBooking[]
  escalations: { contactId: string; name: string; note: string }[]
  top_conversations: DigestConversation[]
  narrative: string | null
}

function dayBounds(dateParam: string | null): { start: Date; end: Date; label: string } {
  const base = dateParam ? new Date(dateParam) : new Date()
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const end = new Date(start.getTime() + 86_400_000)
  return { start, end, label: start.toISOString().slice(0, 10) }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID
  const { start, end, label } = dayBounds(req.nextUrl.searchParams.get('date'))

  const data = IS_MOCK
    ? buildMockDigest(workspaceId, start, end, label)
    : await buildDbDigest(workspaceId, start, end, label)

  data.narrative = await writeNarrative(data)
  return NextResponse.json({ data })
}

function buildMockDigest(workspaceId: string, start: Date, end: Date, label: string): DigestData {
  const contacts = MockDB.getContacts(workspaceId)
  const within = (d: Date) => d >= start && d < end

  const perContact = contacts.map((c) => {
    const msgs = MockDB.getMessages(c._id).filter((m) => within(m.createdAt))
    return { contact: c, msgs }
  }).filter((e) => e.msgs.length > 0)

  const allMsgs = perContact.flatMap((e) => e.msgs)

  return {
    date: label,
    conversations_handled: perContact.length,
    inbound_messages: allMsgs.filter((m) => m.direction === 'inbound').length,
    ai_replies: allMsgs.filter((m) => m.aiGenerated).length,
    bookings_created: MockDB.getAppointments(workspaceId)
      .filter((a) => within(a.createdAt))
      .map((a) => ({ contactName: a.contactName, className: a.className, startsAt: a.startsAt, kind: a.kind })),
    escalations: contacts
      .filter((c) => c.attentionRequired)
      .map((c) => ({ contactId: c._id, name: c.name ?? 'Unknown', note: c.notes || 'Flagged for human attention' })),
    top_conversations: perContact
      .sort((a, b) => b.msgs.length - a.msgs.length)
      .slice(0, 3)
      .map((e) => ({
        contactId: e.contact._id,
        name: e.contact.name ?? 'Unknown',
        channel: e.contact.channel,
        messageCount: e.msgs.length,
        lastMessage: e.msgs[e.msgs.length - 1].content.slice(0, 120),
      })),
    narrative: null,
  }
}

async function buildDbDigest(workspaceId: string, start: Date, end: Date, label: string): Promise<DigestData> {
  interface ContactRow { id: string; name?: string; channel: string; attentionRequired?: boolean; notes?: string }
  interface MessageRow { contactId: string; direction: string; content: string; aiGenerated?: boolean; createdAt: string | Date }
  interface AppointmentRow { contactName: string; className: string; startsAt: string | Date; kind: string; createdAt: string | Date }
  const contacts = await getContacts(workspaceId) as unknown as ContactRow[]
  const [groups, allBookings] = await Promise.all([
    Promise.all(contacts.map((c) => getMessages(c.id))), getAppointments(workspaceId),
  ]) as [MessageRow[][], AppointmentRow[]]
  const within = (value: string | Date) => { const d = new Date(value); return d >= start && d < end }
  const messages = groups.flat().filter((m) => within(m.createdAt))
  const bookings = allBookings.filter((a) => within(a.createdAt))
  const flagged = contacts.filter((c) => c.attentionRequired)

  const byContact = new Map<string, typeof messages>()
  for (const m of messages) {
    const list = byContact.get(m.contactId) ?? []
    byContact.set(m.contactId, [...list, m])
  }

  const contactById = new Map(contacts.map((c) => [c.id, c]))

  return {
    date: label,
    conversations_handled: byContact.size,
    inbound_messages: messages.filter((m) => m.direction === 'inbound').length,
    ai_replies: messages.filter((m) => m.aiGenerated).length,
    bookings_created: bookings.map((a) => ({
      contactName: a.contactName, className: a.className, startsAt: a.startsAt, kind: a.kind,
    })),
    escalations: flagged.map((c) => ({
      contactId: c.id,
      name: c.name ?? 'Unknown',
      note: c.notes || 'Flagged for human attention',
    })),
    top_conversations: [...byContact.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([contactId, msgs]) => ({
        contactId,
        name: contactById.get(contactId)?.name ?? 'Unknown',
        channel: contactById.get(contactId)?.channel ?? 'whatsapp',
        messageCount: msgs.length,
        lastMessage: msgs[msgs.length - 1].content.slice(0, 120),
      })),
    narrative: null,
  }
}

const NARRATIVE_SYSTEM = `You write the daily summary a wellness-studio owner reads in 20 seconds. Given the day's stats, write 2-3 plain sentences: what the AI agent handled, what went well (bookings!), and what needs the owner's attention. Warm, factual, no fluff, no greetings.`

async function writeNarrative(data: DigestData): Promise<string | null> {
  if (!hasAiKey()) return null
  try {
    const { llmChat } = await import('@/lib/llm')
    const facts = JSON.stringify({
      conversations: data.conversations_handled,
      inbound: data.inbound_messages,
      ai_replies: data.ai_replies,
      bookings: data.bookings_created.map((b) => `${b.contactName} → ${b.className}`),
      escalations: data.escalations.map((e) => `${e.name}: ${e.note}`),
    })
    return await llmChat(NARRATIVE_SYSTEM, [{ role: 'user', content: facts }], 250)
  } catch {
    return null
  }
}
