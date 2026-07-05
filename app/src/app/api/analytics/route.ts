import { NextRequest, NextResponse } from 'next/server'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'
import { Appointment } from '@/models/Appointment'

const WEEK_MS = 7 * 86_400_000

interface DayVolume {
  label: string
  inbound: number
  outbound: number
}

function computeVolumeByDay(messages: { direction: string; createdAt: Date }[]): DayVolume[] {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString(undefined, { weekday: 'short' })
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayEnd = dayStart + 86_400_000
    const within = (m: { createdAt: Date }) =>
      m.createdAt.getTime() >= dayStart && m.createdAt.getTime() < dayEnd
    return {
      label,
      inbound: messages.filter((m) => m.direction === 'inbound' && within(m)).length,
      outbound: messages.filter((m) => m.direction === 'outbound' && within(m)).length,
    }
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'

  if (IS_MOCK) {
    const contacts = MockDB.getContacts(workspaceId)
    const allMessages = contacts.flatMap((c) => MockDB.getMessages(c._id))

    const stageCounts = Object.fromEntries(
      ['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'].map((s) => [
        s,
        contacts.filter((c) => c.lifecycleStage === s).length,
      ]),
    )

    const channelCounts = Object.fromEntries(
      ['whatsapp','instagram','line','webchat'].map((ch) => [
        ch,
        contacts.filter((c) => c.channel === ch).length,
      ]),
    )

    const weekAgo = Date.now() - WEEK_MS
    const bookingsWeek = MockDB.getAppointments(workspaceId)
      .filter((a) => a.createdAt.getTime() >= weekAgo).length

    return NextResponse.json({
      contacts_total: contacts.length,
      messages_total: allMessages.length,
      ai_messages: allMessages.filter((m) => m.aiGenerated).length,
      bookings_week: bookingsWeek,
      stage_counts: stageCounts,
      channel_counts: channelCounts,
      volume_by_day: computeVolumeByDay(allMessages),
    })
  }

  await connectDb()
  const weekAgoDate = new Date(Date.now() - WEEK_MS)
  const [contacts, totalMessages, aiMessages, bookingsWeek, recentMessages] = await Promise.all([
    Contact.find({ workspaceId }).lean(),
    Message.countDocuments({ workspaceId }),
    Message.countDocuments({ workspaceId, aiGenerated: true }),
    Appointment.countDocuments({ workspaceId, createdAt: { $gte: weekAgoDate } }),
    Message.find({ workspaceId, createdAt: { $gte: weekAgoDate } }).select('direction createdAt').lean(),
  ])

  const stageCounts = Object.fromEntries(
    ['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'].map((s) => [
      s,
      contacts.filter((c) => c.lifecycleStage === s).length,
    ]),
  )

  const channelCounts = Object.fromEntries(
    ['whatsapp','instagram','line','webchat'].map((ch) => [
      ch,
      contacts.filter((c) => c.channel === ch).length,
    ]),
  )

  return NextResponse.json({
    contacts_total: contacts.length,
    messages_total: totalMessages,
    ai_messages: aiMessages,
    bookings_week: bookingsWeek,
    stage_counts: stageCounts,
    channel_counts: channelCounts,
    volume_by_day: computeVolumeByDay(recentMessages),
  })
}
