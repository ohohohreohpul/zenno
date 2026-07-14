import { IS_MOCK } from './mock-store'
import { findContactByExternal, getChannelConnection, hasInboundMessage } from './queries'
import { sendWhatsApp } from './channels/whatsapp'
import { sendInstagram } from './channels/instagram'
import { sendLine, sendLinePush } from './channels/line'
import { sendTelegram } from './channels/telegram'
import { sendMessenger } from './channels/messenger'
import { isGatewayConfigured, sendGatewayText } from './channels/wa-gateway'
import { tryReserveSend, type SendKind } from './send-limits'
import type { IChannelConnection } from '@/models/ChannelConnection'

/**
 * Unified outbound delivery. Each channel prefers the workspace's own
 * stored connection (QR-linked WhatsApp, Telegram bot, LINE channel,
 * Messenger page); env-configured provider keys are the single-tenant
 * fallback where one exists. Missing credentials or provider errors never
 * throw — the message is already persisted; delivery is best-effort and
 * reported.
 */

export interface DeliveryResult {
  delivered: boolean
  reason: string | null
}

export interface DeliveryOptions {
  /** 'reply' = conversational answer (skips inter-send delay); 'bulk' = campaign/broadcast. */
  kind?: SendKind
}

const CHANNEL_CREDENTIALS: Record<string, string[]> = {
  whatsapp: ['WHATSAPP_API_KEY'],
  instagram: ['META_PAGE_ACCESS_TOKEN'],
  line: ['LINE_CHANNEL_ACCESS_TOKEN'],
}

export function isChannelConfigured(channel: string): boolean {
  const required = CHANNEL_CREDENTIALS[channel]
  if (!required) return false
  return required.every((key) => Boolean(process.env[key]))
}

async function findConnection(
  workspaceId: string,
  channel: string,
): Promise<IChannelConnection | null> {
  try {
    const connection = await getChannelConnection(workspaceId, channel)
    if (!connection || connection.status !== 'connected') return null
    return connection as unknown as IChannelConnection
  } catch (error: unknown) {
    console.error(`[transport] ${channel} connection lookup failed:`, error)
    return null
  }
}

const NOT_CONNECTED = (channel: string): DeliveryResult => ({
  delivered: false,
  reason: `${channel} channel is not connected`,
})

const DELIVERED: DeliveryResult = { delivered: true, reason: null }

export async function deliverMessage(
  workspaceId: string,
  channel: string,
  externalContactId: string,
  text: string,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  if (IS_MOCK) return { delivered: false, reason: 'Mock mode — nothing is transmitted' }

  try {
    switch (channel) {
      case 'whatsapp': {
        if (isGatewayConfigured()) {
          const conn = await findConnection(workspaceId, 'whatsapp')
          if (conn) {
            const kind = options.kind ?? 'reply'
            let isNewContact = false
            if (kind === 'bulk') {
              const contact = await findContactByExternal(workspaceId, externalContactId, 'whatsapp') as { id?: string } | null
              isNewContact = !contact?.id || !(await hasInboundMessage(contact.id))
            }
            const reservation = await tryReserveSend(conn, kind, isNewContact)
            if (!reservation.ok) return { delivered: false, reason: reservation.reason }
            await sendGatewayText(conn.instanceName, externalContactId, text)
            return DELIVERED
          }
        }
        if (isChannelConfigured('whatsapp')) {
          await sendWhatsApp(externalContactId, text)
          return DELIVERED
        }
        return NOT_CONNECTED('whatsapp')
      }

      case 'telegram': {
        const conn = await findConnection(workspaceId, 'telegram')
        const botToken = conn?.credentials?.botToken
        if (!botToken) return NOT_CONNECTED('telegram')
        await sendTelegram(botToken, externalContactId, text)
        return DELIVERED
      }

      case 'line': {
        const conn = await findConnection(workspaceId, 'line')
        const accessToken = conn?.credentials?.channelAccessToken
        if (accessToken) {
          await sendLinePush(accessToken, externalContactId, text)
          return DELIVERED
        }
        if (isChannelConfigured('line')) {
          await sendLine(externalContactId, text)
          return DELIVERED
        }
        return NOT_CONNECTED('line')
      }

      case 'messenger': {
        const conn = await findConnection(workspaceId, 'messenger')
        const pageToken = conn?.credentials?.pageAccessToken
        if (!pageToken) return NOT_CONNECTED('messenger')
        await sendMessenger(pageToken, externalContactId, text)
        return DELIVERED
      }

      case 'instagram': {
        const conn = await findConnection(workspaceId, 'instagram')
        const pageToken = conn?.credentials?.pageAccessToken
        if (pageToken) {
          await sendInstagram(pageToken, externalContactId, text)
          return DELIVERED
        }
        const envToken = process.env.META_PAGE_ACCESS_TOKEN
        if (!envToken) return NOT_CONNECTED('instagram')
        await sendInstagram(envToken, externalContactId, text)
        return DELIVERED
      }

      case 'webchat':
        // The stored message IS the delivery — the widget polls for it.
        return DELIVERED

      default:
        return { delivered: false, reason: `No sender for channel: ${channel}` }
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Delivery failed'
    console.error(`[transport] ${channel} delivery failed:`, error)
    return { delivered: false, reason }
  }
}
