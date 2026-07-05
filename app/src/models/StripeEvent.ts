import { Schema, model, models, type Document } from 'mongoose'

export interface IStripeEvent extends Document<string> {
  _id: string
  type: string
  processed: boolean
  createdAt: Date
}

const StripeEventSchema = new Schema<IStripeEvent>(
  {
    _id:       { type: String },
    type:      { type: String, required: true },
    processed: { type: Boolean, default: false },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
)

export const StripeEvent =
  models.StripeEvent || model<IStripeEvent>('StripeEvent', StripeEventSchema)
