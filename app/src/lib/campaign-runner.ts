import { IS_MOCK, MockDB } from './mock-store'
import { connectDb } from './db'
import { Campaign } from '@/models/Campaign'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'

/**
 * Direct campaign execution — no queue. Sends the campaign's first message
 * step to eligible contacts; the AI agent then handles every reply that
 * comes back through the normal inbound path.
 */

interface RunResult {
  enrolled: number
  contacts: { id: string; name: string | null }[]
}

interface FlowMessageStep {
  type: 'message'
  content: string
}

function isMessageStep(step: unknown): step is FlowMessageStep {
  return (
    typeof step === 'object' &&
    step !== null &&
    (step as { type?: unknown }).type === 'message' &&
    typeof (step as { content?: unknown }).content === 'string'
  )
}

function firstMessageStep(flow: unknown[]): FlowMessageStep | null {
  return flow.find(isMessageStep) ?? null
}

function interpolate(template: string, name: string | null): string {
  return template.replaceAll('{{name}}', name ?? 'there')
}

interface EligibleContact {
  id: string
  name: string | null
  channel: string
  externalId?: string
}

async function findEligibleContacts(workspaceId: string, triggerStage: string): Promise<EligibleContact[]> {
  if (IS_MOCK) {
    return MockDB.getContacts(workspaceId)
      .filter((c) => c.lifecycleStage === triggerStage && !c.dnd && c.botActive)
      .map((c) => ({ id: c._id, name: c.name, channel: c.channel, externalId: c.externalId }))
  }
  await connectDb()
  const contacts = await Contact.find({ workspaceId, lifecycleStage: triggerStage, dnd: false, botActive: true }).lean()
  return contacts.map((c) => ({ id: c._id.toString(), name: c.name, channel: c.channel, externalId: c.externalId }))
}

async function sendCampaignMessage(
  workspaceId: string,
  contact: EligibleContact,
  content: string,
): Promise<void> {
  const message = {
    workspaceId,
    contactId: contact.id,
    channel: contact.channel,
    direction: 'outbound' as const,
    content: interpolate(content, contact.name),
    aiGenerated: true,
  }
  if (IS_MOCK) {
    MockDB.addMessage(message)
    return
  }
  await connectDb()
  await Message.create(message)

  // Callers don't always carry externalId — resolve it before transmitting.
  const externalId = contact.externalId
    ?? (await Contact.findById(contact.id).select('externalId').lean())?.externalId
  if (externalId) {
    const { deliverMessage } = await import('./transport')
    await deliverMessage(contact.channel, externalId, message.content)
  }
}

interface CampaignData {
  workspaceId: string
  triggerStage: string | null
  status: string
  flow: unknown[]
}

async function loadCampaign(campaignId: string): Promise<CampaignData | null> {
  if (IS_MOCK) {
    const c = MockDB.getCampaign(campaignId)
    return c ? { workspaceId: c.workspaceId, triggerStage: c.triggerStage, status: c.status, flow: c.flow } : null
  }
  await connectDb()
  const c = await Campaign.findById(campaignId).lean()
  return c ? { workspaceId: c.workspaceId, triggerStage: c.triggerStage ?? null, status: c.status, flow: (c.flow ?? []) as unknown[] } : null
}

/**
 * Fire a campaign now: send its opening message to every contact currently
 * in the trigger stage (skipping DND and bot-paused contacts).
 */
export async function runCampaign(campaignId: string): Promise<RunResult> {
  const campaign = await loadCampaign(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  if (!campaign.triggerStage) throw new Error('Campaign has no trigger stage')

  const step = firstMessageStep(campaign.flow)
  if (!step) throw new Error('Campaign flow has no message step')

  const contacts = await findEligibleContacts(campaign.workspaceId, campaign.triggerStage)
  for (const contact of contacts) {
    await sendCampaignMessage(campaign.workspaceId, contact, step.content)
  }

  return { enrolled: contacts.length, contacts: contacts.map((c) => ({ id: c.id, name: c.name })) }
}

interface ActiveCampaign {
  _id: string
  flow: unknown[]
}

async function findActiveCampaignsForStage(workspaceId: string, stage: string): Promise<ActiveCampaign[]> {
  if (IS_MOCK) {
    return MockDB.getCampaigns(workspaceId)
      .filter((c) => c.status === 'active' && c.triggerStage === stage)
      .map((c) => ({ _id: c._id, flow: c.flow }))
  }
  await connectDb()
  const campaigns = await Campaign.find({ workspaceId, status: 'active', triggerStage: stage }).lean()
  return campaigns.map((c) => ({ _id: c._id.toString(), flow: (c.flow ?? []) as unknown[] }))
}

/**
 * Auto-trigger: called whenever a contact enters a new lifecycle stage.
 * Every active campaign listening on that stage fires its opening message
 * to this contact — the AI agent handles whatever they reply.
 */
export async function triggerCampaignsForStage(
  workspaceId: string,
  contact: EligibleContact,
  stage: string,
): Promise<number> {
  const campaigns = await findActiveCampaignsForStage(workspaceId, stage)
  let fired = 0
  for (const campaign of campaigns) {
    const step = firstMessageStep(campaign.flow)
    if (!step) continue
    await sendCampaignMessage(workspaceId, contact, step.content)
    fired += 1
  }
  return fired
}
