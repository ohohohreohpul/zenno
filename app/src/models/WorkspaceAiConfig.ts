export interface IGuardrails {
  alwaysEscalateTopics: string[]
  maxDiscountPercent: number | null
  businessHoursOnly: boolean
}

export interface IWorkspaceAiConfig {
  id: string
  workspaceId: string
  systemPrompt: string | null
  knowledgeSummary: string | null
  guardrails?: IGuardrails
  createdAt: Date
  updatedAt: Date
}
