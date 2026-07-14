import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { findCampaignAudience } from '@/lib/queries'

const stage = z.enum(['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'])
const schema = z.object({
  workspaceId: z.string().min(1).default('ws-1'), stages: z.array(stage).max(7).default([]),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  inactiveDays: z.number().int().min(1).max(3650).nullable().default(null),
  lostOnly: z.boolean().default(false), contactIds: z.array(z.string().min(1)).max(1000).default([]),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const contacts = await findCampaignAudience(parsed.data.workspaceId, parsed.data) as Array<Record<string, unknown>>
  return NextResponse.json({ data: { count: contacts.length, contacts: contacts.slice(0, 50).map((contact) => ({ id: contact.id, name: contact.name, channel: contact.channel, lifecycleStage: contact.lifecycleStage, tags: contact.tags })) } })
}
