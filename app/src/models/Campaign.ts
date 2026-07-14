import type { LifecycleStage } from '@/types'

export interface ICampaign {
  id: string
  workspaceId: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  triggerStage: LifecycleStage | null
  goal: string
  flow: unknown[]
  createdAt: Date
  updatedAt: Date
}
