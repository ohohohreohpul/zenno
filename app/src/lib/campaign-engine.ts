import { connectDb } from './db'
import { campaignQueue } from './queue'
import { sendWhatsApp } from './channels/whatsapp'
import { sendInstagram } from './channels/instagram'
import { sendLine } from './channels/line'
import { Campaign } from '@/models/Campaign'
import { CampaignEnrollment } from '@/models/CampaignEnrollment'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'
import type { CampaignJobData } from './queue'
import type { Channel, LifecycleStage } from '@/types'

export type FlowNode =
  | { type: 'message'; content: string; channel?: Channel }
  | { type: 'wait'; delayMs: number }
  | { type: 'branch'; condition: { field: 'lifecycle_stage'; equals: LifecycleStage }; trueIndex: number; falseIndex: number }
  | { type: 'exit' }

export async function enrollContact(
  campaignId: string,
  contactId: string,
  workspaceId: string,
): Promise<void> {
  await connectDb()

  const existing = await CampaignEnrollment.findOne({ campaignId, contactId })
  if (existing?.status === 'active') return

  const enrollment = await CampaignEnrollment.findOneAndUpdate(
    { campaignId, contactId },
    { stepIndex: 0, status: 'active', enrolledAt: new Date() },
    { upsert: true, new: true },
  )

  await scheduleNextStep({
    enrollmentId: enrollment._id.toString(),
    campaignId,
    contactId,
    workspaceId,
    stepIndex: 0,
  })
}

export async function processStep(data: CampaignJobData): Promise<void> {
  await connectDb()

  const { enrollmentId, campaignId, contactId, workspaceId, stepIndex } = data

  const [campaign, contact, enrollment] = await Promise.all([
    Campaign.findById(campaignId).lean(),
    Contact.findById(contactId).lean(),
    CampaignEnrollment.findById(enrollmentId).lean(),
  ])

  if (enrollment?.status !== 'active') return
  if (!campaign || !contact) return

  const flow = campaign.flow as FlowNode[]
  if (stepIndex >= flow.length) {
    await exitEnrollment(enrollmentId, 'completed')
    return
  }

  const node = flow[stepIndex]

  switch (node.type) {
    case 'message': {
      const channel = (node.channel ?? contact.channel) as Channel
      await sendOnChannel(channel, contact.externalId, node.content)
      await Message.create({
        workspaceId,
        contactId,
        channel,
        direction: 'outbound',
        content: node.content,
        aiGenerated: false,
      })
      await advanceToStep(enrollmentId, stepIndex + 1)
      await scheduleNextStep({ ...data, stepIndex: stepIndex + 1 })
      break
    }

    case 'wait': {
      await advanceToStep(enrollmentId, stepIndex + 1)
      await scheduleNextStep({ ...data, stepIndex: stepIndex + 1 }, node.delayMs)
      break
    }

    case 'branch': {
      const { condition, trueIndex, falseIndex } = node
      const matches =
        condition.field === 'lifecycle_stage' &&
        contact.lifecycleStage === condition.equals
      const nextIndex = matches ? trueIndex : falseIndex
      await advanceToStep(enrollmentId, nextIndex)
      await scheduleNextStep({ ...data, stepIndex: nextIndex })
      break
    }

    case 'exit': {
      await exitEnrollment(enrollmentId, 'exited')
      break
    }
  }
}

async function scheduleNextStep(data: CampaignJobData, delayMs = 0): Promise<void> {
  await campaignQueue.add(`step-${data.enrollmentId}-${data.stepIndex}`, data, {
    delay: delayMs,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  })
}

async function advanceToStep(enrollmentId: string, stepIndex: number): Promise<void> {
  await CampaignEnrollment.findByIdAndUpdate(enrollmentId, { stepIndex })
}

async function exitEnrollment(
  enrollmentId: string,
  status: 'completed' | 'exited',
): Promise<void> {
  await CampaignEnrollment.findByIdAndUpdate(enrollmentId, { status })
}

async function sendOnChannel(channel: Channel, externalId: string, text: string): Promise<void> {
  switch (channel) {
    case 'whatsapp':   await sendWhatsApp(externalId, text); break
    case 'instagram':  await sendInstagram(externalId, text); break
    case 'line':       await sendLine(externalId, text); break
    default:           console.warn(`Campaign send not implemented for: ${channel}`)
  }
}
