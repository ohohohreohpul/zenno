export interface ICreditLedger {
  id: string
  agencyId: string
  delta: number
  reason: string
  refId: string | null
  balance: number
  createdAt: Date
}
