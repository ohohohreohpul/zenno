import { Schema, model, models, type Document } from 'mongoose'

export interface IAgency extends Document {
  name: string
  slug: string
  ownerId: string
  logoUrl: string | null
  customDomain: string | null
  brandColor: string
  credits: number
  plan: 'trial' | 'starter' | 'pro' | 'enterprise'
  stripeCustomerId: string | null
  createdAt: Date
  updatedAt: Date
}

const AgencySchema = new Schema<IAgency>(
  {
    name:             { type: String, required: true },
    slug:             { type: String, required: true, unique: true },
    ownerId:          { type: String, required: true, index: true },
    logoUrl:          { type: String, default: null },
    customDomain:     { type: String, default: null, sparse: true, unique: true },
    brandColor:       { type: String, default: '#000000' },
    credits:          { type: Number, required: true, default: 0, min: 0 },
    plan:             { type: String, default: 'trial', enum: ['trial','starter','pro','enterprise'] },
    stripeCustomerId: { type: String, default: null, sparse: true, unique: true },
  },
  { timestamps: true },
)

export const Agency = models.Agency || model<IAgency>('Agency', AgencySchema)
