import type { Channel } from '@/types'

export interface IMessage {
  id: string
  workspaceId: string
  contactId: string
  channel: Channel
  direction: 'inbound' | 'outbound'
  content: string
  aiGenerated: boolean
  createdAt: Date
}
