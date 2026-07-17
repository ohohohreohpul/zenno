export type GatewayStatus = 'disconnected' | 'pending_qr' | 'connected'

export type ConnectableChannel = 'whatsapp' | 'telegram' | 'line' | 'messenger' | 'instagram' | 'webchat'

/** Per-channel credentials a workspace stores when connecting its own account. */
export interface IChannelCredentials {
  /** Latest short-lived QR pushed by the WhatsApp session gateway. */
  pairingQr?: string
  /** Latest WhatsApp phone-number pairing code pushed by the gateway. */
  pairingCode?: string
  /** E.164 digits requested for the phone-number pairing route. */
  pairingPhoneNumber?: string
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
  /** Meta app secret used to verify inbound Instagram webhook signatures. */
  appSecret?: string
  /** Per-workspace Meta webhook verification token. */
  verifyToken?: string
  /** Long-lived Meta user token parked during OAuth while the user picks a page. */
  userAccessToken?: string | null
  /** Instagram professional account id linked to the connected page. */
  instagramId?: string
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
  /** New, never-engaged contacts allowed on day one. */
  newContactCapBase: number
  /** New-contact ceiling once the number is fully warmed. */
  newContactCapMax: number
  /** Number of calendar days used to reach full capacity. */
  rampDays: number
  /** Minimum gap between bulk (campaign/broadcast) sends. */
  minDelaySeconds: number
}

export const DEFAULT_SEND_LIMITS: ISendLimits = {
  dailyCapBase: 50,
  dailyCapMax: 500,
  newContactCapBase: 0,
  newContactCapMax: 50,
  rampDays: 60,
  minDelaySeconds: 15,
}

/**
 * A workspace-owned messaging channel connected through the session gateway
 * (user scans a QR with their own WhatsApp). One document per
 * workspace+channel. Also carries the send counters used for warm-up quotas.
 */
export interface IChannelConnection {
  id: string
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
  /** UTC day (YYYY-MM-DD) the newContactsToday counter belongs to. */
  newContactDate: string | null
  newContactsToday: number
  lastSentAt: Date | null
  createdAt: Date
  updatedAt: Date
}
