import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { generateReplyCore, hasAiKey } from '@/lib/ai'
import { connectDb } from '@/lib/db'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'
import { deliverMessage } from '@/lib/transport'

const DEFAULT_WORKSPACE_ID = 'ws-1'
const MAX_RECIPIENTS = 50

const requestSchema = z.object({
  workspaceId: z.string().min(1).default(DEFAULT_WORKSPACE_ID),
  stages: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  instruction: z.string().min(1).max(2000),
  mode: z.enum(['preview', 'send']).default('preview'),
})

interface BroadcastTarget {
  contactId: string
  name: string
  channel: string
  stage: string
  message: string
}

const PERSONALIZE_SYSTEM = `You write short, personal outbound messages for a wellness business. Given a campaign instruction and one contact's details, write ONE message (2-3 sentences max) addressed to that specific person by name, in a warm human tone that fits their lifecycle stage. No greetings like "Dear", no sign-offs, no hashtags. Output only the message text.`

function templateMessage(instruction: string, name: string): string {
  return `Hi ${name}! ${instruction}`
}

async function personalize(instruction: string, name: string, stage: string, tags: string[]): Promise<string> {
  if (!hasAiKey()) return templateMessage(instruction, name)
  try {
    return await generateReplyCore(
      PERSONALIZE_SYSTEM,
      [],
      `Campaign instruction: ${instruction}\nContact: ${name} | Lifecycle stage: ${stage} | Tags: ${tags.join(', ') || 'none'}`,
    )
  } catch {
    return templateMessage(instruction, name)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { workspaceId, stages, tags, instruction, mode } = parsed.data

  const recipients = IS_MOCK
    ? MockDB.getContacts(workspaceId)
        .filter((c) => !c.dnd)
        .filter((c) => stages.length === 0 || stages.includes(c.lifecycleStage))
        .filter((c) => tags.length === 0 || c.tags.some((t) => tags.includes(t)))
        .slice(0, MAX_RECIPIENTS)
        .map((c) => ({ _id: c._id, name: c.name, channel: c.channel, lifecycleStage: c.lifecycleStage, tags: c.tags }))
    : await findDbRecipients(workspaceId, stages, tags)

  if (recipients.length === 0) {
    return NextResponse.json({ data: { targets: [], sent: 0 } })
  }

  const targets: BroadcastTarget[] = await Promise.all(
    recipients.map(async (c) => ({
      contactId: c._id,
      name: c.name ?? 'there',
      channel: c.channel,
      stage: c.lifecycleStage,
      message: await personalize(instruction, c.name ?? 'there', c.lifecycleStage, c.tags),
    })),
  )

  if (mode === 'preview') {
    return NextResponse.json({ data: { targets, sent: 0 } })
  }

  for (const t of targets) {
    if (IS_MOCK) {
      MockDB.addMessage({
        workspaceId,
        contactId: t.contactId,
        channel: t.channel,
        direction: 'outbound',
        content: t.message,
        aiGenerated: true,
      })
    } else {
      await Message.create({
        workspaceId,
        contactId: t.contactId,
        channel: t.channel,
        direction: 'outbound',
        content: t.message,
        aiGenerated: true,
      })
      const contact = await Contact.findById(t.contactId).select('externalId').lean()
      if (contact) await deliverMessage(t.channel, contact.externalId, t.message)
    }
  }

  return NextResponse.json({ data: { targets, sent: targets.length } })
}

interface BroadcastRecipient {
  _id: string
  name: string | null
  channel: string
  lifecycleStage: string
  tags: string[]
}

async function findDbRecipients(
  workspaceId: string,
  stages: string[],
  tags: string[],
): Promise<BroadcastRecipient[]> {
  await connectDb()
  const query: Record<string, unknown> = { workspaceId, dnd: false }
  if (stages.length > 0) query.lifecycleStage = { $in: stages }
  if (tags.length > 0) query.tags = { $in: tags }

  const contacts = await Contact.find(query).limit(MAX_RECIPIENTS).lean()
  return contacts.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    channel: c.channel,
    lifecycleStage: c.lifecycleStage,
    tags: c.tags ?? [],
  }))
}
