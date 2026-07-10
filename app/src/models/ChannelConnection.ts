import { Schema, model, models, type Document } from 'mongoose'

export type GatewayStatus = 'disconnected' | 'pending_qr' | 'connected'

export interface ISendLimits {
  /** Allowed sends on day one, before the number has warmed up. */
  dailyCapBase: number
  /** Ceiling the cap ramps up to as the number ages. */
  dailyCapMax: number
  /** Minimum gap between bulk (campaign/broadcast) sends. */
  minDelaySeconds: number
}

export const DEFAULT_SEND_LIMITS: ISendLimits = {
  dailyCapBase: 20,
  dailyCapMax: 200,
  minDelaySeconds: 15,
}

/**
 * A workspace-owned messaging channel connected through the session gateway
 * (user scans a QR with their own WhatsApp). One document per
 * workspace+channel. Also carries the send counters used for warm-up quotas.
 */
export interface IChannelConnection extends Document {
  workspaceId: string
  channel: 'whatsapp'
  instanceName: string
  status: GatewayStatus
  phoneNumber: string | null
  /** When the number was first connected — drives the warm-up ramp. */
  warmupStartedAt: Date | null
  limits: ISendLimits
  /** UTC day (YYYY-MM-DD) the sentToday counter belongs to. */
  sentDate: string | null
  sentToday: number
  lastSentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const ChannelConnectionSchema = new Schema<IChannelConnection>(
  {
    workspaceId:     { type: String, required: true, index: true },
    channel:         { type: String, required: true, default: 'whatsapp' },
    instanceName:    { type: String, required: true, unique: true, index: true },
    status:          { type: String, default: 'disconnected' },
    phoneNumber:     { type: String, default: null },
    warmupStartedAt: { type: Date, default: null },
    limits: {
      dailyCapBase:    { type: Number, default: DEFAULT_SEND_LIMITS.dailyCapBase },
      dailyCapMax:     { type: Number, default: DEFAULT_SEND_LIMITS.dailyCapMax },
      minDelaySeconds: { type: Number, default: DEFAULT_SEND_LIMITS.minDelaySeconds },
    },
    sentDate:   { type: String, default: null },
    sentToday:  { type: Number, default: 0 },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
)

ChannelConnectionSchema.index({ workspaceId: 1, channel: 1 }, { unique: true })

export const ChannelConnection =
  models.ChannelConnection ||
  model<IChannelConnection>('ChannelConnection', ChannelConnectionSchema)
