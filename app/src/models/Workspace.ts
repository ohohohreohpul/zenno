import { Schema, model, models, type Document } from 'mongoose'

export interface IWorkspace extends Document {
  name: string
  slug: string
  logoUrl: string | null
  agencyId: string | null
  createdAt: Date
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name:      { type: String, required: true },
    slug:      { type: String, required: true, unique: true },
    logoUrl:   { type: String, default: null },
    agencyId:  { type: String, default: null, index: true },
  },
  { timestamps: true },
)

export const Workspace = models.Workspace || model<IWorkspace>('Workspace', WorkspaceSchema)
