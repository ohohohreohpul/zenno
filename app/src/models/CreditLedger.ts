import { Schema, model, models, type Document } from 'mongoose'

export interface ICreditLedger extends Document {
  agencyId: string
  delta: number
  reason: string
  refId: string | null
  balance: number
  createdAt: Date
}

const CreditLedgerSchema = new Schema<ICreditLedger>(
  {
    agencyId: { type: String, required: true, index: true },
    delta:    { type: Number, required: true },
    reason:   { type: String, required: true },
    refId:    { type: String, default: null },
    balance:  { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const CreditLedger =
  models.CreditLedger || model<ICreditLedger>('CreditLedger', CreditLedgerSchema)
