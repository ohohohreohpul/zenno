import { Schema, model, models, type Document } from 'mongoose'

export type AppointmentKind = 'trial' | 'regular' | 'consult'

export interface IAppointment extends Document {
  workspaceId: string
  contactId: string | null
  contactName: string
  className: string
  startsAt: Date
  durationMin: number
  channel: string
  kind: AppointmentKind
  createdAt: Date
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    workspaceId: { type: String, required: true, index: true },
    contactId:   { type: String, default: null },
    contactName: { type: String, required: true },
    className:   { type: String, required: true },
    startsAt:    { type: Date, required: true, index: true },
    durationMin: { type: Number, required: true },
    channel:     { type: String, required: true },
    kind:        { type: String, required: true, default: 'regular', enum: ['trial', 'regular', 'consult'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const Appointment = models.Appointment || model<IAppointment>('Appointment', AppointmentSchema)
