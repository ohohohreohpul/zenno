import { Schema, model, models, type Document } from 'mongoose'
import type { Channel } from '@/types'

export interface IMessage extends Document {
  workspaceId: string
  contactId: string
  channel: Channel
  direction: 'inbound' | 'outbound'
  content: string
  aiGenerated: boolean
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    workspaceId:  { type: String, required: true, index: true },
    contactId:    { type: String, required: true, index: true },
    channel:      { type: String, required: true },
    direction:    { type: String, required: true, enum: ['inbound', 'outbound'] },
    content:      { type: String, required: true },
    aiGenerated:  { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const Message = models.Message || model<IMessage>('Message', MessageSchema)
