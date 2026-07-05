import { Schema, model, models, type Document } from 'mongoose'

export interface IScheduleSlot extends Document {
  workspaceId: string
  className: string
  dayOfWeek: number
  time: string
  durationMin: number
  capacity: number
  booked: number
  instructor: string
}

const ScheduleSlotSchema = new Schema<IScheduleSlot>(
  {
    workspaceId: { type: String, required: true, index: true },
    className:   { type: String, required: true },
    dayOfWeek:   { type: Number, required: true, min: 0, max: 6 },
    time:        { type: String, required: true },
    durationMin: { type: Number, required: true },
    capacity:    { type: Number, required: true },
    booked:      { type: Number, required: true, default: 0 },
    instructor:  { type: String, required: true },
  },
  { timestamps: true },
)

export const ScheduleSlot = models.ScheduleSlot || model<IScheduleSlot>('ScheduleSlot', ScheduleSlotSchema)
