import { NextRequest, NextResponse } from 'next/server'
import { getAppointments, getContacts, getMessages } from '@/lib/queries'

const WEEK_MS = 7 * 86_400_000
interface MessageRow { direction: string; aiGenerated?: boolean; createdAt: string | Date }
function computeVolumeByDay(messages: MessageRow[]) {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const within = (m: MessageRow) => { const t = new Date(m.createdAt).getTime(); return t >= start && t < start + 86_400_000 }
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), inbound: messages.filter((m) => m.direction === 'inbound' && within(m)).length, outbound: messages.filter((m) => m.direction === 'outbound' && within(m)).length }
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'
  const contacts = await getContacts(workspaceId) as unknown as Array<{ id: string; lifecycleStage: string; channel: string }>
  const [messageGroups, appointments] = await Promise.all([
    Promise.all(contacts.map((c) => getMessages(c.id))), getAppointments(workspaceId),
  ]) as [MessageRow[][], Array<{ createdAt: string | Date }>]
  const messages = messageGroups.flat()
  const inboundMessages = messages.filter((m) => m.direction === 'inbound').length
  const outboundMessages = messages.filter((m) => m.direction === 'outbound').length
  const weekAgo = Date.now() - WEEK_MS
  const stages = ['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip']
  const channels = ['whatsapp','instagram','line','webchat']
  return NextResponse.json({
    contacts_total: contacts.length,
    messages_total: messages.length,
    inbound_messages: inboundMessages,
    outbound_messages: outboundMessages,
    reply_rate: inboundMessages > 0 ? Math.min(100, Math.round((outboundMessages / inboundMessages) * 100)) : 0,
    ai_messages: messages.filter((m) => m.aiGenerated).length,
    bookings_week: appointments.filter((a) => new Date(a.createdAt).getTime() >= weekAgo).length,
    stage_counts: Object.fromEntries(stages.map((s) => [s, contacts.filter((c) => c.lifecycleStage === s).length])),
    channel_counts: Object.fromEntries(channels.map((ch) => [ch, contacts.filter((c) => c.channel === ch).length])),
    volume_by_day: computeVolumeByDay(messages.filter((m) => new Date(m.createdAt).getTime() >= weekAgo)),
  })
}
