import {
  claimCampaignEnrollments,
  createCampaignRun,
  createMessage,
  enqueueCampaignEnrollment,
  findCampaignAudience,
  getActiveCampaignRun,
  getAiConfig,
  getCampaign,
  getCampaigns,
  getCampaignRunDeliveryStats,
  getContact,
  getContacts,
  getRecentMessages,
  getWorkspace,
  hasInboundMessageAfter,
  updateCampaignRun,
  updateContact,
  updateEnrollment,
} from './queries'
import { DEFAULT_SYSTEM_PROMPT, type ChatTurn } from './ai'

export interface RunResult {
  eligible: number
  queued: number
  skipped: number
  contacts: { id: string; name: string | null }[]
  runId: string | null
  alreadyRunning?: boolean
}

interface FlowMessageStep { type: 'message'; content: string }
interface CampaignRow {
  id?: unknown; _id?: unknown; workspaceId?: unknown; triggerStage?: unknown; status?: unknown;
  campaignType?: unknown; audience?: unknown; followUpDelaysDays?: unknown; goal?: unknown; flow?: unknown;
}
interface CampaignAudience {
  stages: string[]
  tags: string[]
  inactiveDays: number | null
  lostOnly: boolean
  contactIds: string[]
  resumeBot: boolean
}
interface EligibleContact {
  id: string
  name: string | null
  channel: string
  externalId?: string
  memorySummary?: string
  lifecycleStage?: string
  dnd?: boolean
  botActive?: boolean
}
interface CampaignData {
  id: string
  workspaceId: string
  triggerStage: string | null
  status: string
  goal: string
  flow: unknown[]
  campaignType: 'manual' | 'triggered'
  audience: CampaignAudience
  followUpDelaysDays: number[]
}
interface ClaimedEnrollment {
  id: string
  campaignId: string
  runId?: string | null
  contactId: string
  attemptCount: number
  stepIndex: number
  sentAt?: string | null
  sendsCompleted?: number
  messageContent?: string | null
}

function isMessageStep(step: unknown): step is FlowMessageStep {
  return typeof step === 'object' && step !== null
    && (step as { type?: unknown }).type === 'message'
    && typeof (step as { content?: unknown }).content === 'string'
}
function firstMessageStep(flow: unknown[]): FlowMessageStep | null { return flow.find(isMessageStep) ?? null }
function interpolate(template: string, name: string | null): string { return template.replaceAll('{{name}}', name ?? 'there') }

async function loadCampaign(campaignId: string): Promise<CampaignData | null> {
  const campaign = await getCampaign(campaignId) as unknown as CampaignRow | null
  if (!campaign) return null
  const audience = (campaign.audience ?? {}) as Partial<CampaignAudience>
  return {
    id: String(campaign.id ?? campaign._id ?? campaignId),
    workspaceId: String(campaign.workspaceId),
    triggerStage: typeof campaign.triggerStage === 'string' ? campaign.triggerStage : null,
    status: String(campaign.status),
    goal: String(campaign.goal ?? ''),
    flow: Array.isArray(campaign.flow) ? campaign.flow : [],
    campaignType: campaign.campaignType === 'manual' ? 'manual' : 'triggered',
    audience: {
      stages: audience.stages ?? [], tags: audience.tags ?? [], inactiveDays: audience.inactiveDays ?? null,
      lostOnly: audience.lostOnly ?? false, contactIds: audience.contactIds ?? [], resumeBot: audience.resumeBot !== false,
    },
    followUpDelaysDays: Array.isArray(campaign.followUpDelaysDays) ? campaign.followUpDelaysDays : [],
  }
}

async function findEligibleContacts(workspaceId: string, triggerStage: string): Promise<EligibleContact[]> {
  const contacts = await getContacts(workspaceId) as unknown as EligibleContact[]
  return contacts.filter((contact) => contact.lifecycleStage === triggerStage && !contact.dnd && contact.botActive !== false)
}

async function generateCampaignMessage(campaign: CampaignData, contact: EligibleContact, stepIndex: number): Promise<string> {
  const fallbackStep = firstMessageStep(campaign.flow)
  if (!campaign.goal.trim()) return fallbackStep ? interpolate(fallbackStep.content, contact.name) : ''
  const { llmChat } = await import('./llm')
  const cfg = await getAiConfig(campaign.workspaceId) as { systemPrompt?: string; knowledgeSummary?: string }
  const recent = stepIndex > 0 ? await getRecentMessages(contact.id, 8) as Array<{ direction?: string; content?: string }> : []
  const conversation = recent.length > 0
    ? `\n\nRecent conversation:\n${recent.map((message) => `${message.direction === 'inbound' ? 'Lead' : 'Business'}: ${message.content ?? ''}`).join('\n')}`
    : ''
  const task = stepIndex === 0
    ? 'Write the FIRST outbound message of a sales campaign to this contact.'
    : `Write follow-up ${stepIndex} for a lead who has not replied. Do not repeat the opening; add a useful new reason to respond and keep it low-pressure.`
  const system = `${cfg.systemPrompt || DEFAULT_SYSTEM_PROMPT}${cfg.knowledgeSummary ? `\n\nBusiness knowledge:\n${cfg.knowledgeSummary}` : ''}${contact.memorySummary ? `\nWhat you know about this contact: ${contact.memorySummary}` : ''}${conversation}

${task}
Campaign goal: ${campaign.goal}

Rules:
- One short message (2-4 sentences), warm and specific.
- Use known context when relevant; never invent details.
- End with one concrete next step or question.
- Match their language. No emojis unless they use them.
- Never mention campaigns, automation, or AI.`
  const turns: ChatTurn[] = []
  try { return await llmChat(system, turns, 250) }
  catch { return stepIndex === 0 && fallbackStep ? interpolate(fallbackStep.content, contact.name) : '' }
}

export async function queueContactsForCampaign(
  campaignId: string,
  contacts: EligibleContact[],
  preparedMessages: Map<string, string> = new Map(),
  runId: string | null = null,
): Promise<RunResult> {
  let queued = 0
  let skipped = 0
  for (const contact of contacts) {
    const result = await enqueueCampaignEnrollment(campaignId, contact.id, preparedMessages.get(contact.id), runId)
    if (result.created) queued += 1
    else skipped += 1
  }
  return { eligible: contacts.length, queued, skipped, contacts: contacts.map(({ id, name }) => ({ id, name })), runId }
}

/** Manual campaigns resolve their saved audience at click time and create a repeatable run. */
export async function runCampaign(campaignId: string): Promise<RunResult> {
  const campaign = await loadCampaign(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  if (campaign.campaignType === 'manual') {
    const active = await getActiveCampaignRun(campaignId) as { id?: string } | null
    if (active?.id) return { eligible: 0, queued: 0, skipped: 0, contacts: [], runId: active.id, alreadyRunning: true }
    const run = await createCampaignRun(campaignId) as { id: string }
    const contacts = await findCampaignAudience(campaign.workspaceId, campaign.audience) as unknown as EligibleContact[]
    if (campaign.audience.resumeBot) {
      await Promise.all(contacts.filter((contact) => contact.botActive === false).map((contact) => updateContact(contact.id, { botActive: true })))
    }
    const result = await queueContactsForCampaign(campaignId, contacts, new Map(), run.id)
    await updateCampaignRun(run.id, result.queued > 0 ? { status: 'running' } : { status: 'completed', completedAt: new Date() })
    return result
  }
  if (!campaign.triggerStage) throw new Error('Triggered campaign has no trigger stage')
  return queueContactsForCampaign(campaignId, await findEligibleContacts(campaign.workspaceId, campaign.triggerStage))
}

function retryAt(reason: string, attempts: number): Date | null {
  if (/minimum gap|throttled/i.test(reason)) return new Date(Date.now() + 60_000)
  if (/warm-up send limit|cold outreach/i.test(reason)) {
    const tomorrow = new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); tomorrow.setUTCHours(0, 5, 0, 0); return tomorrow
  }
  return attempts < 5 ? new Date(Date.now() + Math.min(attempts * 5, 30) * 60_000) : null
}

async function processEnrollment(enrollment: ClaimedEnrollment): Promise<'delivered' | 'retry' | 'failed' | 'skipped'> {
  const [campaign, rawContact] = await Promise.all([loadCampaign(enrollment.campaignId), getContact(enrollment.contactId)])
  const contact = rawContact as unknown as EligibleContact | null
  if (!campaign || !contact || contact.dnd || (campaign.campaignType === 'triggered' && contact.botActive === false)) {
    await updateEnrollment(enrollment.id, { status: 'exited', deliveryStatus: 'skipped', lastError: 'Campaign or contact is no longer eligible' })
    return 'skipped'
  }
  if (enrollment.stepIndex > 0 && enrollment.sentAt && await hasInboundMessageAfter(contact.id, enrollment.sentAt)) {
    await updateEnrollment(enrollment.id, { status: 'exited', deliveryStatus: 'skipped', nextRunAt: null, lastError: 'Stopped because the lead replied' })
    return 'skipped'
  }
  const [aiConfig, workspace] = await Promise.all([getAiConfig(campaign.workspaceId), getWorkspace(campaign.workspaceId)])
  if ((aiConfig as { guardrails?: { businessHoursOnly?: boolean } }).guardrails?.businessHoursOnly) {
    const { isWithinBusinessHours } = await import('./business-hours')
    if (!isWithinBusinessHours(workspace as Parameters<typeof isWithinBusinessHours>[0])) {
      await updateEnrollment(enrollment.id, { status: 'active', deliveryStatus: 'retry', nextRunAt: new Date(Date.now() + 15 * 60_000), lastError: 'Waiting for configured business hours' })
      return 'retry'
    }
  }
  if (!contact.externalId) {
    await updateEnrollment(enrollment.id, { status: 'exited', deliveryStatus: 'failed', lastError: 'Contact has no channel recipient ID' })
    return 'failed'
  }
  const content = enrollment.messageContent?.trim() || await generateCampaignMessage(campaign, contact, enrollment.stepIndex)
  if (!content) {
    await updateEnrollment(enrollment.id, { status: 'exited', deliveryStatus: 'failed', lastError: 'Campaign could not produce a message' })
    return 'failed'
  }
  const { deliverMessage } = await import('./transport')
  const delivery = await deliverMessage(campaign.workspaceId, contact.channel, contact.externalId, content, { kind: 'bulk' })
  if (!delivery.delivered) {
    const reason = delivery.reason ?? 'Delivery failed'
    const nextRunAt = retryAt(reason, enrollment.attemptCount)
    await updateEnrollment(enrollment.id, { deliveryStatus: nextRunAt ? 'retry' : 'failed', status: nextRunAt ? 'active' : 'exited', nextRunAt, lastError: reason, messageContent: content })
    return nextRunAt ? 'retry' : 'failed'
  }
  const message = await createMessage({ workspaceId: campaign.workspaceId, contactId: contact.id, channel: contact.channel, direction: 'outbound', content, aiGenerated: true }) as { id?: string }
  const sentAt = new Date()
  const nextDelayDays = campaign.followUpDelaysDays[enrollment.stepIndex]
  if (typeof nextDelayDays === 'number') {
    await updateEnrollment(enrollment.id, {
      status: 'active', deliveryStatus: 'queued', stepIndex: enrollment.stepIndex + 1,
      sentAt, nextRunAt: new Date(sentAt.getTime() + nextDelayDays * 86_400_000), lastError: null,
      messageContent: null, messageId: message.id, attemptCount: 0,
      sendsCompleted: (enrollment.sendsCompleted ?? 0) + 1,
    })
  } else {
    await updateEnrollment(enrollment.id, {
      status: 'completed', deliveryStatus: 'delivered', sentAt, nextRunAt: null, lastError: null,
      messageContent: content, messageId: message.id, sendsCompleted: (enrollment.sendsCompleted ?? 0) + 1,
    })
  }
  return 'delivered'
}

async function completeRunIfFinished(runId: string | null | undefined): Promise<void> {
  if (!runId) return
  const stats = await getCampaignRunDeliveryStats(runId)
  if (stats.queued + stats.retry + stats.sending === 0) await updateCampaignRun(runId, { status: 'completed', completedAt: new Date() })
}

export async function processCampaignQueue(batchSize = 1) {
  const claimed = await claimCampaignEnrollments(batchSize) as unknown as ClaimedEnrollment[]
  const result = { claimed: claimed.length, delivered: 0, retry: 0, failed: 0, skipped: 0 }
  for (const enrollment of claimed) {
    const status = await processEnrollment(enrollment)
    result[status] += 1
    if (status !== 'retry') await completeRunIfFinished(enrollment.runId)
  }
  return result
}

async function findActiveCampaignsForStage(workspaceId: string, stage: string): Promise<CampaignData[]> {
  const campaigns = await getCampaigns(workspaceId) as unknown as CampaignRow[]
  const loaded = await Promise.all(campaigns.filter((campaign) => campaign.status === 'active' && campaign.campaignType !== 'manual' && campaign.triggerStage === stage).map((campaign) => loadCampaign(String(campaign.id))))
  return loaded.filter((campaign): campaign is CampaignData => campaign !== null)
}

export async function triggerCampaignsForStage(workspaceId: string, contact: EligibleContact, stage: string): Promise<number> {
  const campaigns = await findActiveCampaignsForStage(workspaceId, stage)
  let queued = 0
  for (const campaign of campaigns) {
    const result = await enqueueCampaignEnrollment(campaign.id, contact.id)
    if (result.created) queued += 1
  }
  return queued
}
