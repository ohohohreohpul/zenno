export type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'line' | 'webchat' | 'sms' | 'email'

export type LifecycleStage =
  | 'inquiry'
  | 'qualified'
  | 'trial_booked'
  | 'attended'
  | 'reviewed'
  | 'rebooked'
  | 'vip'

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
}

export interface Contact {
  id: string
  workspace_id: string
  external_id: string
  channel: Channel
  name: string | null
  phone: string | null
  instagram_handle: string | null
  lifecycle_stage: LifecycleStage
  created_at: string
  updated_at: string
  tags?: string[]
  bot_active?: boolean
  dnd?: boolean
  chat_status?: 'open' | 'closed'
  attention_required?: boolean
  notes?: string
}

export interface Message {
  id: string
  workspace_id: string
  contact_id: string
  channel: Channel
  direction: 'inbound' | 'outbound'
  content: string
  ai_generated: boolean
  created_at: string
}

export interface Conversation {
  contact: Contact
  messages: Message[]
  last_message: Message | null
  unread_count: number
}

export interface IncomingMessage {
  channel: Channel
  external_contact_id: string
  contact_name: string | null
  content: string
  raw: unknown
}
