import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DEFAULT_SYSTEM_PROMPT, hasAiKey, type ChatTurn } from '@/lib/ai'
import { generateAgentReply } from '@/lib/agent-tools'
import { deliverMessage } from '@/lib/transport'
import { guardrailsToPrompt } from '@/lib/guardrails'
import { createMessage, getAiConfig, getContact, getMessages, getWorkspace, updateContact } from '@/lib/queries'
import type { IGuardrails } from '@/models/WorkspaceAiConfig'
import { requestWorkspaceId } from '@/lib/request-context'

type Params = { params: Promise<{ id: string }> }
interface ContactRecord { id: string; workspaceId: string; externalId: string; channel: string; name: string | null; lifecycleStage: string; botActive: boolean; memorySummary?: string }
interface MessageRecord { id: string; contactId: string; channel: string; direction: 'inbound' | 'outbound'; content: string; aiGenerated: boolean; createdAt: string | Date }

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params
  const [contact, messages] = await Promise.all([getContact(id), getMessages(id)]) as [ContactRecord | null, MessageRecord[]]
  if (!contact || contact.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  return NextResponse.json({
    contact: { id: contact.id, workspace_id: contact.workspaceId, external_id: contact.externalId, channel: contact.channel, name: contact.name, lifecycle_stage: contact.lifecycleStage },
    messages: messages.map((m) => ({ id: m.id, contact_id: m.contactId, channel: m.channel, direction: m.direction, content: m.content, ai_generated: m.aiGenerated, created_at: m.createdAt })),
  })
}

const sendSchema = z.object({ content: z.string().min(1).max(4000), as: z.enum(['agent', 'customer']).default('agent') })

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id: contactId } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const contact = await getContact(contactId) as ContactRecord | null
  if (!contact || contact.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  const isCustomer = parsed.data.as === 'customer'
  const msg = await createMessage({ workspaceId: contact.workspaceId, contactId, channel: contact.channel, direction: isCustomer ? 'inbound' : 'outbound', content: parsed.data.content, aiGenerated: false })

  if (!isCustomer) {
    const botPaused = contact.botActive !== false
    if (botPaused) await updateContact(contactId, { botActive: false })
    const delivery = await deliverMessage(contact.workspaceId, contact.channel, contact.externalId, parsed.data.content, { kind: 'reply' })
    return NextResponse.json({ data: msg, delivery, bot_paused: botPaused }, { status: 201 })
  }

  try {
    const replyText = await generateReply(contactId, contact, parsed.data.content)
    const reply = await createMessage({ workspaceId: contact.workspaceId, contactId, channel: contact.channel, direction: 'outbound', content: replyText, aiGenerated: true })
    const delivery = await deliverMessage(contact.workspaceId, contact.channel, contact.externalId, replyText, { kind: 'reply' })
    return NextResponse.json({ data: msg, reply, delivery }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ data: msg, ai_error: error instanceof Error ? error.message : 'AI reply failed' }, { status: 201 })
  }
}

async function generateReply(contactId: string, contact: ContactRecord, incomingText: string): Promise<string> {
  if (!hasAiKey()) return 'Thanks for your message! The AI provider is not configured yet.'
  const [config, messages, workspace] = await Promise.all([getAiConfig(contact.workspaceId), getMessages(contactId), getWorkspace(contact.workspaceId)]) as [
    { systemPrompt?: string; knowledgeSummary?: string; guardrails?: IGuardrails }, MessageRecord[], { timezone?: string; currency?: string } | null,
  ]
  const history: ChatTurn[] = messages.slice(0, -1).slice(-10).map((m) => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: m.content }))
  const knowledge = config.knowledgeSummary ? `\n\nBUSINESS KNOWLEDGE:\n${config.knowledgeSummary}` : ''
  const memory = contact.memorySummary ? `\nWhat you know about this contact: ${contact.memorySummary}` : ''
  const context = `\n\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}${memory}`
  const prompt = (config.systemPrompt || DEFAULT_SYSTEM_PROMPT) + guardrailsToPrompt(config.guardrails) + knowledge + context
  return (await generateAgentReply(prompt, history, incomingText, {
    workspaceId: contact.workspaceId,
    contactId,
    contactName: contact.name ?? 'Customer',
    channel: contact.channel,
    timezone: workspace?.timezone ?? 'UTC',
    currency: workspace?.currency ?? 'USD',
  })).reply
}
