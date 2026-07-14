export interface ICampaignEnrollment {
  id: string
  campaignId: string
  contactId: string
  stepIndex: number
  status: 'active' | 'completed' | 'exited'
  enrolledAt: Date
  nextRunAt: Date | null
  createdAt: Date
  updatedAt: Date
}
