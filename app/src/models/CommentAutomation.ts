import { Schema, model, models, type Document } from 'mongoose'

export interface ICommentAutomationStats {
  commentsCaptured: number
  dmsSent: number
  booked: number
}

export interface ICommentAutomation extends Document {
  workspaceId: string
  keyword: string
  postLabel: string
  openingDm: string
  status: 'active' | 'paused'
  stats: ICommentAutomationStats
  createdAt: Date
}

const CommentAutomationSchema = new Schema<ICommentAutomation>(
  {
    workspaceId: { type: String, required: true, index: true },
    keyword:     { type: String, required: true },
    postLabel:   { type: String, required: true },
    openingDm:   { type: String, required: true },
    status:      { type: String, required: true, default: 'active', enum: ['active', 'paused'] },
    stats: {
      commentsCaptured: { type: Number, default: 0 },
      dmsSent:          { type: Number, default: 0 },
      booked:           { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

export const CommentAutomation =
  models.CommentAutomation || model<ICommentAutomation>('CommentAutomation', CommentAutomationSchema)
