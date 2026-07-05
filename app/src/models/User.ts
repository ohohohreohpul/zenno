import { Schema, model, models, type Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  passwordHash: string
  name: string
  role: 'owner' | 'admin' | 'staff'
  agencyId: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    name:         { type: String, required: true },
    role:         { type: String, default: 'owner', enum: ['owner', 'admin', 'staff'] },
    agencyId:     { type: String, default: 'agency-1' },
  },
  { timestamps: true },
)

export const User = models.User || model<IUser>('User', UserSchema)
