import { connectDb } from './db'
import { DEFAULT_SYSTEM_PROMPT, hasAiKey, type ChatTurn } from './ai'
import { generateAgentReply } from './agent-tools'
import { deliverMessage } from './transport'
import { triggerCampaignsForStage } from './campaign-runner'
import { spendCredit } from './credits'
import { Contact, type IContact } from '@/models/Contact'
import { Message } from '@/models/Message'
import { Workspace } from '@/models/Workspace'
import { WorkspaceAiConfig } from '@/models/WorkspaceAiConfig'
import type { LifecycleStage, IncomingMessage } from '@/types'

const HISTORY_LIMIT = 20

/**
 * Full inbound loop for real channel traffic: upsert contact, store the
 * message, generate a tool-using agent reply, transmit it back out, and
 * advance lifecycle. Delivery failures never lose data — everything is
 * persisted before transmission is attempted.
 */
export async function handleIncoming(
  workspaceId: string,
  incoming: IncomingMessage,
): Promise<void> {
  await connectDb()

  const contact = await upsertContact(workspaceId, incoming)
  const contactId = contact._id.toString()

  await Message.create({
    workspaceId,
    contactId,
    channel: incoming.channel,
    direction: 'inbound',
    content: incoming.content,
    aiGenerated: false,
  })
  await Contact.findByIdAndUpdate(contactId, { $inc: { unread: 1 } })

  if (!shouldAutoReply(contact)) return

  const agencyId = await getAgencyId(workspaceId)
  if (agencyId) {
    const { ok } = await spendCredit(agencyId, 'ai_reply', contactId)
    if (!ok) return
  }

  const reply = await generateReplyWithTools(workspaceId, contact, contactId, incoming.content)
  if (!reply) return

  await Message.create({
    workspaceId,
    contactId,
    channel: incoming.channel,
    direction: 'outbound',
    content: reply,
    aiGenerated: true,
  })

  // Best-effort transmission — the reply is already stored either way.
  await deliverMessage(incoming.channel, incoming.external_contact_id, reply)

  if (contact.lifecycleStage === 'inquiry') {
    await advanceLifecycle(contactId, 'qualified')
  }
}

function shouldAutoReply(contact: IContact): boolean {
  if (!hasAiKey()) return false
  if (contact.botActive === false) return false
  if (contact.dnd === true) return false
  return true
}

async function generateReplyWithTools(
  workspaceId: string,
  contact: IContact,
  contactId: string,
  incomingText: string,
): Promise<string | null> {
  const [config, recent] = await Promise.all([
    WorkspaceAiConfig.findOne({ workspaceId }).lean(),
    Message.find({ contactId }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean(),
  ])

  const history: ChatTurn[] = recent
    .reverse()
    .slice(0, -1)
    .map((m) => ({
      role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))

  const { guardrailsToPrompt } = await import('./guardrails')
  const systemPrompt = (config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT) + guardrailsToPrompt(config?.guardrails)
  const contactContext = `\n\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}`

  try {
    const result = await generateAgentReply(systemPrompt + contactContext, history, incomingText, {
      workspaceId,
      contactId,
      contactName: contact.name ?? 'Customer',
      channel: contact.channel,
    })
    return result.reply || null
  } catch {
    return null
  }
}

async function upsertContact(
  workspaceId: string,
  incoming: IncomingMessage,
): Promise<IContact> {
  const contact = await Contact.findOneAndUpdate(
    { workspaceId, externalId: incoming.external_contact_id, channel: incoming.channel },
    {
      $setOnInsert: { lifecycleStage: 'inquiry' },
      $set: { name: incoming.contact_name ?? undefined },
    },
    { upsert: true, new: true },
  )

  if (!contact) throw new Error('Failed to upsert contact')
  return contact
}

async function getAgencyId(workspaceId: string): Promise<string | null> {
  try {
    // Workspace ids may be plain strings (seeded 'ws-1') or ObjectIds.
    const ws = await Workspace.findOne({ _id: workspaceId }).select('agencyId').lean()
    return ws?.agencyId ?? null
  } catch {
    return null
  }
}

export async function advanceLifecycle(
  contactId: string,
  stage: LifecycleStage,
): Promise<void> {
  await connectDb()

  const contact = await Contact.findByIdAndUpdate(
    contactId,
    { lifecycleStage: stage },
    { new: true },
  ).select('workspaceId name channel').lean()

  if (!contact) return

  await triggerCampaignsForStage(
    contact.workspaceId,
    { id: contactId, name: contact.name, channel: contact.channel },
    stage,
  )
}
