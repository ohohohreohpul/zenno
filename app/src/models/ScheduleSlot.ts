export interface IScheduleSlot {
  id: string
  workspaceId: string
  className: string
  dayOfWeek: number
  time: string
  durationMin: number
  capacity: number
  booked: number
  instructor: string
  createdAt: Date
  updatedAt: Date
}
