import { Schema, model, models, type Document } from 'mongoose'
import type { Channel, LifecycleStage } from '@/types'

export interface IContact extends Document {
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
  createdAt: Date
  updatedAt: Date
}

const ContactSchema = new Schema<IContact>(
  {
    workspaceId:      { type: String, required: true, index: true },
    externalId:       { type: String, required: true },
    channel:          { type: String, required: true, enum: ['whatsapp','instagram','line','webchat','sms','email'] },
    name:             { type: String, default: null },
    phone:            { type: String, default: null },
    instagramHandle:  { type: String, default: null },
    lifecycleStage:   {
      type: String,
      required: true,
      default: 'inquiry',
      enum: ['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'],
      index: true,
    },
    tags:              { type: [String], default: [] },
    botActive:         { type: Boolean, default: true },
    dnd:               { type: Boolean, default: false },
    chatStatus:        { type: String, enum: ['open', 'closed'], default: 'open' },
    attentionRequired: { type: Boolean, default: false },
    unread:            { type: Number, default: 0 },
    notes:             { type: String, default: '' },
  },
  { timestamps: true },
)

ContactSchema.index({ workspaceId: 1, externalId: 1, channel: 1 }, { unique: true })

export const Contact = models.Contact || model<IContact>('Contact', ContactSchema)
