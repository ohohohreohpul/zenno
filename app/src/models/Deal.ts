import { Schema, model, models, type Document } from 'mongoose'

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface IDeal extends Document {
  workspaceId: string
  contactId: string | null
  name: string
  contactName: string
  value: number
  currency: string
  stage: DealStage
  channel: string
  createdAt: Date
  updatedAt: Date
}

const DealSchema = new Schema<IDeal>(
  {
    workspaceId: { type: String, required: true, index: true },
    contactId:   { type: String, default: null },
    name:        { type: String, required: true },
    contactName: { type: String, required: true },
    value:       { type: Number, required: true },
    currency:    { type: String, default: 'THB' },
    stage:       {
      type: String,
      required: true,
      default: 'lead',
      enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      index: true,
    },
    channel:     { type: String, required: true },
  },
  { timestamps: true },
)

export const Deal = models.Deal || model<IDeal>('Deal', DealSchema)
