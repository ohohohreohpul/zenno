import { Schema, model, models, type Document } from 'mongoose'

export type GatewayStatus = 'disconnected' | 'pending_qr' | 'connected'

export type ConnectableChannel = 'whatsapp' | 'telegram' | 'line' | 'messenger' | 'webchat'

/** Per-channel credentials a workspace stores when connecting its own account. */
export interface IChannelCredentials {
  /** Telegram bot token from @BotFather. */
  botToken?: string
  /** Telegram bot username, for display. */
  botUsername?: string
  /** LINE channel secret (webhook signature verification). */
  channelSecret?: string
  /** LINE channel access token (push API). */
  channelAccessToken?: string
  /** Messenger page access token (Graph send API). */
  pageAccessToken?: string
  /** Messenger page id — routes inbound webhook events to the workspace. */
  pageId?: string
  /** Public embed key for the web chat widget. */
  embedKey?: string
  /** Secret we generate and hand to the platform (e.g. Telegram secret_token). */
  webhookSecret?: string
}

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
  channel: ConnectableChannel
  credentials: IChannelCredentials
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
    channel:         {
      type: String,
      required: true,
      enum: ['whatsapp', 'telegram', 'line', 'messenger', 'webchat'],
      default: 'whatsapp',
    },
    credentials: {
      botToken:           { type: String, default: null },
      botUsername:        { type: String, default: null },
      channelSecret:      { type: String, default: null },
      channelAccessToken: { type: String, default: null },
      pageAccessToken:    { type: String, default: null },
      pageId:             { type: String, default: null },
      embedKey:           { type: String, default: null },
      webhookSecret:      { type: String, default: null },
    },
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
ChannelConnectionSchema.index({ 'credentials.embedKey': 1 }, { sparse: true })
ChannelConnectionSchema.index({ 'credentials.pageId': 1 }, { sparse: true })

export const ChannelConnection =
  models.ChannelConnection ||
  model<IChannelConnection>('ChannelConnection', ChannelConnectionSchema)
