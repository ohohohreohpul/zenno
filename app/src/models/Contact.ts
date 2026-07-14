import type { Channel, LifecycleStage } from '@/types'

export interface IContact {
  id: string
  workspaceId: string
  externalId: string
  channel: Channel
  name: string | null
  phone: string | null
  instagramHandle: string | null
  lifecycleStage: LifecycleStage
  tags: string[]
  botActive: boolean
  dnd: boolean
  chatStatus: 'open' | 'closed'
  attentionRequired: boolean
  unread: number
  notes: string
  memorySummary: string
  memoryUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
