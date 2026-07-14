import { DEFAULT_SYSTEM_PROMPT, hasAiKey, type ChatTurn } from './ai'
import { generateAgentReply } from './agent-tools'
import { deliverMessage } from './transport'
import { triggerCampaignsForStage } from './campaign-runner'
import { spendCredit } from './credits'
import {
  upsertContact as dbUpsertContact,
  updateContact,
  incrementUnread,
  createMessage,
  getRecentMessages,
  getAiConfig,
  getWorkspace,
} from './queries'
import type { IContact } from '@/models/Contact'
import type { IMessage } from '@/models/Message'
import type { LifecycleStage, IncomingMessage } from '@/types'
import type { IGuardrails } from '@/models/WorkspaceAiConfig'

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
  const contact = await upsertContact(workspaceId, incoming)
  const contactId = contact.id

  await createMessage({
    workspaceId,
    contactId,
    channel: incoming.channel,
    direction: 'inbound',
    content: incoming.content,
    aiGenerated: false,
  })
  await incrementUnread(contactId)

  if (!shouldAutoReply(contact)) return

  const agencyId = await getAgencyId(workspaceId)
  if (agencyId) {
    const { ok } = await spendCredit(agencyId, 'ai_reply', contactId)
    if (!ok) return
  }

  // Turn voice notes and photos into text before the agent reasons over them.
  let effectiveContent = incoming.content
  if (incoming.media && incoming.media.length > 0) {
    try {
      const { describeMedia } = await import('./media')
      const desc = await describeMedia(incoming.media)
      if (desc.understood && desc.text) {
        effectiveContent = incoming.content ? `${incoming.content}\n${desc.text}` : desc.text
      }
    } catch {
      // Media understanding must never block the reply.
    }
  }

  const reply = await generateReplyWithTools(workspaceId, contact, contactId, effectiveContent)
  if (!reply) return

  await createMessage({
    workspaceId,
    contactId,
    channel: incoming.channel,
    direction: 'outbound',
    content: reply,
    aiGenerated: true,
  })

  await deliverMessage(workspaceId, incoming.channel, incoming.external_contact_id, reply, { kind: 'reply' })

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
  const [config, recent, workspace] = await Promise.all([
    getAiConfig(workspaceId),
    getRecentMessages(contactId, HISTORY_LIMIT),
    getWorkspace(workspaceId),
  ])

  const cfg = config as { systemPrompt?: string; guardrails?: IGuardrails; knowledgeSummary?: string }
  const history: ChatTurn[] = (recent as IMessage[])
    .slice(0, -1)
    .map((m) => ({
      role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))

  const { guardrailsToPrompt } = await import('./guardrails')
  const systemPrompt = (cfg.systemPrompt ?? DEFAULT_SYSTEM_PROMPT) + guardrailsToPrompt(cfg.guardrails)
  const knowledgeContext = cfg.knowledgeSummary
    ? `\n\nBUSINESS KNOWLEDGE — use these facts and never invent conflicting information:\n${cfg.knowledgeSummary}`
    : ''
  const memoryContext = contact.memorySummary
    ? `\n\nWhat you already know about this contact (use it — don't re-ask): ${contact.memorySummary}`
    : ''
  const contactContext = `\n\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}${memoryContext}`

  try {
    const result = await generateAgentReply(systemPrompt + knowledgeContext + contactContext, history, incomingText, {
      workspaceId,
      contactId,
      contactName: contact.name ?? 'Customer',
      channel: contact.channel,
      timezone: (workspace as { timezone?: string } | null)?.timezone ?? 'UTC',
      currency: (workspace as { currency?: string } | null)?.currency ?? 'USD',
    })
    return result.reply || null
  } catch (error) {
    console.error('[conversation] agent reply failed:', error)
    return null
  }
}

async function upsertContact(
  workspaceId: string,
  incoming: IncomingMessage,
): Promise<IContact> {
  const contact = await dbUpsertContact(
    workspaceId,
    incoming.external_contact_id,
    incoming.channel,
    { name: incoming.contact_name ?? undefined },
  )
  if (!contact) throw new Error('Failed to upsert contact')
  return contact as unknown as IContact
}

async function getAgencyId(workspaceId: string): Promise<string | null> {
  try {
    const ws = await getWorkspace(workspaceId)
    return (ws as { agencyId?: string } | null)?.agencyId ?? null
  } catch {
    return null
  }
}

export async function advanceLifecycle(
  contactId: string,
  stage: LifecycleStage,
): Promise<void> {
  const contact = await updateContact(contactId, { lifecycleStage: stage }) as IContact | null
  if (!contact) return

  await triggerCampaignsForStage(
    contact.workspaceId,
    { id: contactId, name: contact.name, channel: contact.channel },
    stage,
  )
}
