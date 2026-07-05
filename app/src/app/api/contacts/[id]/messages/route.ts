import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { hasAiKey, DEFAULT_SYSTEM_PROMPT, type ChatTurn } from '@/lib/ai'
import { generateAgentReply, type AgentResult } from '@/lib/agent-tools'
import { deliverMessage } from '@/lib/transport'
import { guardrailsToPrompt } from '@/lib/guardrails'
import { connectDb } from '@/lib/db'
import { Contact, type IContact } from '@/models/Contact'
import { Message } from '@/models/Message'
import { WorkspaceAiConfig } from '@/models/WorkspaceAiConfig'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id: contactId } = await params

  if (IS_MOCK) {
    const contact = MockDB.getContact(contactId)
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    const messages = MockDB.getMessages(contactId)
    return NextResponse.json({
      contact: { id: contact._id, workspace_id: contact.workspaceId, external_id: contact.externalId, channel: contact.channel, name: contact.name, lifecycle_stage: contact.lifecycleStage },
      messages: messages.map((m) => ({ id: m._id, contact_id: m.contactId, channel: m.channel, direction: m.direction, content: m.content, ai_generated: m.aiGenerated, created_at: m.createdAt })),
    })
  }

  await connectDb()
  const [contact, messages] = await Promise.all([
    Contact.findById(contactId).lean(),
    Message.find({ contactId }).sort({ createdAt: 1 }).lean(),
  ])

  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  return NextResponse.json({
    contact: { id: contact._id.toString(), workspace_id: contact.workspaceId, external_id: contact.externalId, channel: contact.channel, name: contact.name, lifecycle_stage: contact.lifecycleStage },
    messages: messages.map((m) => ({ id: m._id.toString(), contact_id: m.contactId, channel: m.channel, direction: m.direction, content: m.content, ai_generated: m.aiGenerated, created_at: m.createdAt })),
  })
}

const sendSchema = z.object({
  content: z.string().min(1).max(4000),
  as: z.enum(['agent', 'customer']).optional().default('agent'),
})

async function generateMockAiReply(contactId: string, incomingText: string): Promise<string> {
  const contact = MockDB.getContact(contactId)
  if (!contact) throw new Error('Contact not found')

  if (!hasAiKey()) {
    return 'Thanks for your message! Our AI agent is not fully configured yet — add your ANTHROPIC_API_KEY in .env.local to enable intelligent replies.'
  }

  const history: ChatTurn[] = MockDB.getMessages(contactId)
    .slice(0, -1)
    .slice(-10)
    .map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }))

  const systemPrompt =
    MockDB.getSystemPrompt(contact.workspaceId) + guardrailsToPrompt(MockDB.getGuardrails(contact.workspaceId))
  const contactContext = `\n\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}`
  const result = await generateAgentReply(systemPrompt + contactContext, history, incomingText, {
    workspaceId: contact.workspaceId,
    contactId: contact._id,
    contactName: contact.name ?? 'Customer',
    channel: contact.channel,
  })
  return result.reply
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id: contactId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  if (IS_MOCK) {
    const contact = MockDB.getContact(contactId)
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const isCustomer = parsed.data.as === 'customer'
    const msg = MockDB.addMessage({
      workspaceId: contact.workspaceId,
      contactId,
      channel: contact.channel,
      direction: isCustomer ? 'inbound' : 'outbound',
      content: parsed.data.content,
      aiGenerated: false,
    })

    if (!isCustomer) {
      // A human replied — pause the bot so it doesn't talk over the operator.
      const botPaused = contact.botActive
      if (botPaused) MockDB.updateContact(contactId, { botActive: false })
      return NextResponse.json({ data: msg, bot_paused: botPaused }, { status: 201 })
    }

    try {
      const replyText = await generateMockAiReply(contactId, parsed.data.content)
      const reply = MockDB.addMessage({
        workspaceId: contact.workspaceId,
        contactId,
        channel: contact.channel,
        direction: 'outbound',
        content: replyText,
        aiGenerated: true,
      })
      return NextResponse.json({ data: msg, reply }, { status: 201 })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI reply failed'
      return NextResponse.json({ data: msg, ai_error: message }, { status: 201 })
    }
  }

  await connectDb()
  const contact = await Contact.findById(contactId).lean()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const isCustomer = parsed.data.as === 'customer'
  const msg = await Message.create({
    workspaceId: contact.workspaceId,
    contactId,
    channel: contact.channel,
    direction: isCustomer ? 'inbound' : 'outbound',
    content: parsed.data.content,
    aiGenerated: false,
  })

  if (!isCustomer) {
    // A human replied — pause the bot so it doesn't talk over the operator.
    const botPaused = contact.botActive !== false
    if (botPaused) await Contact.findByIdAndUpdate(contactId, { $set: { botActive: false } })
    const delivery = await deliverMessage(contact.channel, contact.externalId, parsed.data.content)
    return NextResponse.json({ data: msg, delivery, bot_paused: botPaused }, { status: 201 })
  }

  try {
    const replyText = await generateDbAiReply(contactId, contact, parsed.data.content)
    const reply = await Message.create({
      workspaceId: contact.workspaceId,
      contactId,
      channel: contact.channel,
      direction: 'outbound',
      content: replyText,
      aiGenerated: true,
    })
    const delivery = await deliverMessage(contact.channel, contact.externalId, replyText)
    return NextResponse.json({ data: msg, reply, delivery }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI reply failed'
    return NextResponse.json({ data: msg, ai_error: message }, { status: 201 })
  }
}

type LeanContact = Pick<IContact, 'workspaceId' | 'name' | 'lifecycleStage' | 'channel'>

async function generateDbAiReply(
  contactId: string,
  contact: LeanContact,
  incomingText: string,
): Promise<string> {
  if (!hasAiKey()) {
    return 'Thanks for your message! Our AI agent is not fully configured yet — add your ANTHROPIC_API_KEY in .env.local to enable intelligent replies.'
  }

  const [config, recentMessages] = await Promise.all([
    WorkspaceAiConfig.findOne({ workspaceId: contact.workspaceId }).lean(),
    Message.find({ contactId }).sort({ createdAt: 1 }).lean(),
  ])

  const history: ChatTurn[] = recentMessages
    .slice(0, -1)
    .slice(-10)
    .map((m) => ({
      role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))

  const systemPrompt = (config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT) + guardrailsToPrompt(config?.guardrails)
  const contactContext = `\n\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}`
  const result: AgentResult = await generateAgentReply(systemPrompt + contactContext, history, incomingText, {
    workspaceId: contact.workspaceId,
    contactId,
    contactName: contact.name ?? 'Customer',
    channel: contact.channel,
  })
  return result.reply
}
