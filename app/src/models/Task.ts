import { Schema, model, models, type Document } from 'mongoose'

export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done'

export interface ITask extends Document {
  workspaceId: string
  contactId: string | null
  title: string
  contactName: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

const TaskSchema = new Schema<ITask>(
  {
    workspaceId: { type: String, required: true, index: true },
    contactId:   { type: String, default: null },
    title:       { type: String, required: true },
    contactName: { type: String, default: null },
    priority:    { type: String, required: true, default: 'medium', enum: ['high', 'medium', 'low'] },
    status:      {
      type: String,
      required: true,
      default: 'todo',
      enum: ['todo', 'in_progress', 'waiting', 'done'],
      index: true,
    },
    dueDate:     { type: Date, default: null },
  },
  { timestamps: true },
)

export const Task = models.Task || model<ITask>('Task', TaskSchema)
