import { Schema, model, models, type Document } from 'mongoose'

export interface ICampaignEnrollment extends Document {
  campaignId: string
  contactId: string
  stepIndex: number
  status: 'active' | 'completed' | 'exited'
  enrolledAt: Date
  updatedAt: Date
  nextRunAt: Date | null
}

const CampaignEnrollmentSchema = new Schema<ICampaignEnrollment>(
  {
    campaignId:  { type: String, required: true, index: true },
    contactId:   { type: String, required: true, index: true },
    stepIndex:   { type: Number, required: true, default: 0 },
    status:      { type: String, required: true, default: 'active', enum: ['active','completed','exited'] },
    enrolledAt:  { type: Date, default: Date.now },
    nextRunAt:   { type: Date, default: null },
  },
  { timestamps: true },
)

CampaignEnrollmentSchema.index({ campaignId: 1, contactId: 1 }, { unique: true })
CampaignEnrollmentSchema.index({ nextRunAt: 1, status: 1 })

export const CampaignEnrollment =
  models.CampaignEnrollment || model<ICampaignEnrollment>('CampaignEnrollment', CampaignEnrollmentSchema)
