export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done'

export interface ITask {
  id: string
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
