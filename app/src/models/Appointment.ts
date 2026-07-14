export type AppointmentKind = 'trial' | 'regular' | 'consult'

export interface IAppointment {
  id: string
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
