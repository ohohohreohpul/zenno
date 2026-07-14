export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface IDeal {
  id: string
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
