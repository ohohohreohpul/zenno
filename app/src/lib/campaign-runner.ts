import { IS_MOCK, MockDB } from './mock-store'
import { connectDb } from './db'
import { Campaign } from '@/models/Campaign'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'
import { WorkspaceAiConfig } from '@/models/WorkspaceAiConfig'
import { DEFAULT_SYSTEM_PROMPT, type ChatTurn } from './ai'

/**
 * AI-driven campaigns. Each campaign carries a sales *goal* (an instruction).
 * When the campaign fires — manually or on a lifecycle-stage change — the AI
 * writes a personalized opening message per contact (using what we already
 * know about them), sends it, and the inbound agent then handles the reply.
 * No hand-built message/wait/branch flow graph. The AI is the flow.
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
  memorySummary?: string
  lifecycleStage?: string
}

async function findEligibleContacts(workspaceId: string, triggerStage: string): Promise<EligibleContact[]> {
  if (IS_MOCK) {
    return MockDB.getContacts(workspaceId)
      .filter((c) => c.lifecycleStage === triggerStage && !c.dnd && c.botActive)
      .map((c) => ({ id: c._id, name: c.name, channel: c.channel, externalId: c.externalId, memorySummary: c.memorySummary, lifecycleStage: c.lifecycleStage }))
  }
  await connectDb()
  const contacts = await Contact.find({ workspaceId, lifecycleStage: triggerStage, dnd: false, botActive: true }).lean()
  return contacts.map((c) => ({ id: c._id.toString(), name: c.name, channel: c.channel, externalId: c.externalId, memorySummary: c.memorySummary, lifecycleStage: c.lifecycleStage }))
}

async function generateOpeningMessage(
  workspaceId: string,
  goal: string,
  contact: EligibleContact,
): Promise<string> {
  if (!goal.trim()) return ''
  const { llmChat } = await import('./llm')

  let systemPrompt = DEFAULT_SYSTEM_PROMPT
  let knowledge = ''
  try {
    if (IS_MOCK) {
      systemPrompt = MockDB.getSystemPrompt(workspaceId)
    } else {
      await connectDb()
      const cfg = await WorkspaceAiConfig.findOne({ workspaceId }).lean()
      systemPrompt = cfg?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
      knowledge = cfg?.knowledgeSummary ?? ''
    }
  } catch {
    // fall back to default prompt
  }

  const memory = contact.memorySummary ? `\nWhat you already know about this contact: ${contact.memorySummary}` : ''
  const system = `${systemPrompt}${knowledge ? `\n\nBusiness knowledge:\n${knowledge}` : ''}${memory}

You are writing the FIRST outbound message of a sales campaign to this contact. It must read like a real human salesperson reaching out — not a broadcast, not a template.

Campaign goal: ${goal}

Rules:
- One short message (2-4 sentences). Sound human, warm, specific to them.
- Reference what you already know about them when you can.
- End with one concrete next step or question that moves them toward the goal.
- Match their language. No emojis unless the contact uses them.
- Do NOT mention this is a campaign or automated.`

  const turns: ChatTurn[] = []
  return llmChat(system, turns, 250)
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
    await deliverMessage(workspaceId, contact.channel, externalId, message.content, { kind: 'bulk' })
  }
}

interface CampaignData {
  workspaceId: string
  triggerStage: string | null
  status: string
  goal: string
  flow: unknown[]
}

async function loadCampaign(campaignId: string): Promise<CampaignData | null> {
  if (IS_MOCK) {
    const c = MockDB.getCampaign(campaignId)
    return c ? { workspaceId: c.workspaceId, triggerStage: c.triggerStage, status: c.status, goal: c.goal ?? '', flow: c.flow } : null
  }
  await connectDb()
  const c = await Campaign.findById(campaignId).lean()
  return c ? { workspaceId: c.workspaceId, triggerStage: c.triggerStage ?? null, status: c.status, goal: (c as { goal?: string }).goal ?? '', flow: (c.flow ?? []) as unknown[] } : null
}

/**
 * Fire a campaign now: send an AI-personalized opening message to every
 * contact currently in the trigger stage (skipping DND and bot-paused).
 * Falls back to the flow's first message step if no goal is set.
 */
export async function runCampaign(campaignId: string): Promise<RunResult> {
  const campaign = await loadCampaign(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  if (!campaign.triggerStage) throw new Error('Campaign has no trigger stage')

  const hasGoal = Boolean(campaign.goal?.trim())
  const fallbackStep = firstMessageStep(campaign.flow)

  const contacts = await findEligibleContacts(campaign.workspaceId, campaign.triggerStage)
  for (const contact of contacts) {
    let content: string
    if (hasGoal) {
      try {
        content = await generateOpeningMessage(campaign.workspaceId, campaign.goal, contact)
      } catch {
        content = fallbackStep ? interpolate(fallbackStep.content, contact.name) : ''
      }
      if (!content && fallbackStep) content = interpolate(fallbackStep.content, contact.name)
    } else {
      content = fallbackStep ? interpolate(fallbackStep.content, contact.name) : ''
    }
    if (!content) continue
    await sendCampaignMessage(campaign.workspaceId, contact, content)
  }

  return { enrolled: contacts.length, contacts: contacts.map((c) => ({ id: c.id, name: c.name })) }
}

interface ActiveCampaign {
  _id: string
  goal: string
  flow: unknown[]
}

async function findActiveCampaignsForStage(workspaceId: string, stage: string): Promise<ActiveCampaign[]> {
  if (IS_MOCK) {
    return MockDB.getCampaigns(workspaceId)
      .filter((c) => c.status === 'active' && c.triggerStage === stage)
      .map((c) => ({ _id: c._id, goal: c.goal ?? '', flow: c.flow }))
  }
  await connectDb()
  const campaigns = await Campaign.find({ workspaceId, status: 'active', triggerStage: stage }).lean()
  return campaigns.map((c) => ({ _id: c._id.toString(), goal: (c as { goal?: string }).goal ?? '', flow: (c.flow ?? []) as unknown[] }))
}

/**
 * Auto-trigger: called whenever a contact enters a new lifecycle stage.
 * Every active campaign listening on that stage fires an AI-personalized
 * opening message to this contact — the inbound agent handles the reply.
 */
export async function triggerCampaignsForStage(
  workspaceId: string,
  contact: EligibleContact,
  stage: string,
): Promise<number> {
  const campaigns = await findActiveCampaignsForStage(workspaceId, stage)
  let fired = 0
  for (const campaign of campaigns) {
    const hasGoal = Boolean(campaign.goal?.trim())
    const fallbackStep = firstMessageStep(campaign.flow)
    let content: string
    if (hasGoal) {
      try {
        content = await generateOpeningMessage(workspaceId, campaign.goal, contact)
      } catch {
        content = fallbackStep ? interpolate(fallbackStep.content, contact.name) : ''
      }
      if (!content && fallbackStep) content = interpolate(fallbackStep.content, contact.name)
    } else {
      content = fallbackStep ? interpolate(fallbackStep.content, contact.name) : ''
    }
    if (!content) continue
    await sendCampaignMessage(workspaceId, contact, content)
    fired += 1
  }
  return fired
}
