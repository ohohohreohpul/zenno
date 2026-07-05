import { Worker } from 'bullmq'
import { CAMPAIGN_QUEUE } from './queue'

const connection = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
}
import { processStep } from './campaign-engine'
import type { CampaignJobData } from './queue'

export function startWorker(): Worker {
  const worker = new Worker<CampaignJobData>(
    CAMPAIGN_QUEUE,
    async (job) => {
      await processStep(job.data)
    },
    {
      connection,
      concurrency: 10,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`Campaign job ${job?.id} failed:`, err.message)
  })

  return worker
}
