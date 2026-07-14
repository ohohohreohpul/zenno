export interface IUser {
  id: string
  email: string
  passwordHash: string
  name: string
  role: 'owner' | 'admin' | 'staff'
  agencyId: string | null
  createdAt: Date
  updatedAt: Date
}
