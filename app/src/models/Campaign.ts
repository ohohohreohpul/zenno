import { Schema, model, models, type Document } from 'mongoose'
import type { LifecycleStage } from '@/types'

export interface ICampaign extends Document {
  workspaceId: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  triggerStage: LifecycleStage | null
  flow: unknown[]
  createdAt: Date
  updatedAt: Date
}

const CampaignSchema = new Schema<ICampaign>(
  {
    workspaceId:  { type: String, required: true, index: true },
    name:         { type: String, required: true },
    status:       { type: String, required: true, default: 'draft', enum: ['draft','active','paused','completed'] },
    triggerStage: { type: String, default: null },
    flow:         { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
)

export const Campaign = models.Campaign || model<ICampaign>('Campaign', CampaignSchema)
