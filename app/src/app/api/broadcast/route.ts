import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateReplyCore, hasAiKey } from '@/lib/ai'
import { createCampaign, getContacts } from '@/lib/queries'
import { queueContactsForCampaign } from '@/lib/campaign-runner'
import { requestWorkspaceId } from '@/lib/request-context'

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

  const { stages, tags, instruction, mode } = parsed.data
  const workspaceId = requestWorkspaceId(req, parsed.data.workspaceId)

  const recipients = await findRecipients(workspaceId, stages, tags)

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

  const campaign = await createCampaign({
    workspaceId,
    name: `Broadcast ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    triggerStage: null,
    goal: instruction,
    flow: [],
    status: 'active',
  }) as { id: string }
  const prepared = new Map(targets.map((target) => [target.contactId, target.message]))
  const result = await queueContactsForCampaign(
    campaign.id,
    recipients.map((contact) => ({
      id: contact._id,
      name: contact.name,
      channel: contact.channel,
      lifecycleStage: contact.lifecycleStage,
    })),
    prepared,
  )

  return NextResponse.json({ data: { targets, queued: result.queued, skipped: result.skipped, sent: 0 } })
}

interface BroadcastRecipient {
  _id: string
  name: string | null
  channel: string
  lifecycleStage: string
  tags: string[]
}

async function findRecipients(
  workspaceId: string,
  stages: string[],
  tags: string[],
): Promise<BroadcastRecipient[]> {
  const contacts = await getContacts(workspaceId) as unknown as Array<{ id: string; name: string | null; channel: string; lifecycleStage: string; tags?: string[]; dnd?: boolean }>
  return contacts.filter((c) => !c.dnd)
    .filter((c) => stages.length === 0 || stages.includes(c.lifecycleStage))
    .filter((c) => tags.length === 0 || (c.tags ?? []).some((t) => tags.includes(t)))
    .slice(0, MAX_RECIPIENTS).map((c) => ({
    _id: c.id,
    name: c.name,
    channel: c.channel,
    lifecycleStage: c.lifecycleStage,
    tags: c.tags ?? [],
  }))
}
