import { Queue } from 'bullmq'

// BullMQ ships its own ioredis — pass connection URL to avoid version mismatch
const connection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}

export const CAMPAIGN_QUEUE = 'campaign-steps'

export const campaignQueue = new Queue(CAMPAIGN_QUEUE, { connection })

export type CampaignJobData = {
  enrollmentId: string
  campaignId: string
  contactId: string
  workspaceId: string
  stepIndex: number
}

export { connection }
