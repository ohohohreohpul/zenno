import { Schema, model, models, type Document } from 'mongoose'

export interface IGuardrails {
  alwaysEscalateTopics: string[]
  maxDiscountPercent: number | null
  businessHoursOnly: boolean
}

export interface IWorkspaceAiConfig extends Document {
  workspaceId: string
  systemPrompt: string | null
  knowledgeSummary: string | null
  guardrails?: IGuardrails
}

const WorkspaceAiConfigSchema = new Schema<IWorkspaceAiConfig>(
  {
    workspaceId:      { type: String, required: true, unique: true, index: true },
    systemPrompt:     { type: String, default: null },
    knowledgeSummary: { type: String, default: null },
    guardrails: {
      alwaysEscalateTopics: { type: [String], default: [] },
      maxDiscountPercent:   { type: Number, default: null },
      businessHoursOnly:    { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

export const WorkspaceAiConfig =
  models.WorkspaceAiConfig || model<IWorkspaceAiConfig>('WorkspaceAiConfig', WorkspaceAiConfigSchema)
