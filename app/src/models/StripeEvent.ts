export interface IStripeEvent {
  id: string
  type: string
  processed: boolean
  createdAt: Date
}
