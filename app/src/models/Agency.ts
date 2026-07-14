export type AgencyPlan = 'trial' | 'starter' | 'pro' | 'enterprise'

export interface IAgency {
  id: string
  name: string
  slug: string
  ownerId: string
  logoUrl: string | null
  customDomain: string | null
  brandColor: string
  credits: number
  plan: AgencyPlan
  stripeCustomerId: string | null
  createdAt: Date
  updatedAt: Date
}
