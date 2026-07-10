import { IS_MOCK } from './mock-store'
import { connectDb } from './db'
import { sendWhatsApp } from './channels/whatsapp'
import { sendInstagram } from './channels/instagram'
import { sendLine } from './channels/line'
import { isGatewayConfigured, sendGatewayText } from './channels/wa-gateway'
import { tryReserveSend, type SendKind } from './send-limits'
import { ChannelConnection, type IChannelConnection } from '@/models/ChannelConnection'

/**
 * Unified outbound delivery. WhatsApp prefers the workspace's own
 * gateway-connected number (user scanned a QR — subject to warm-up quotas);
 * env-configured provider keys are the fallback. Missing credentials or
 * provider errors never throw — the message is already persisted; delivery
 * is best-effort and reported.
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

async function findGatewayConnection(
  workspaceId: string,
): Promise<IChannelConnection | null> {
  if (!isGatewayConfigured()) return null
  try {
    await connectDb()
    return await ChannelConnection.findOne({
      workspaceId,
      channel: 'whatsapp',
      status: 'connected',
    })
  } catch (error: unknown) {
    console.error('[transport] gateway connection lookup failed:', error)
    return null
  }
}

export async function deliverMessage(
  workspaceId: string,
  channel: string,
  externalContactId: string,
  text: string,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  if (IS_MOCK) return { delivered: false, reason: 'Mock mode — nothing is transmitted' }

  try {
    if (channel === 'whatsapp') {
      const conn = await findGatewayConnection(workspaceId)
      if (conn) {
        const reservation = await tryReserveSend(conn, options.kind ?? 'reply')
        if (!reservation.ok) return { delivered: false, reason: reservation.reason }
        await sendGatewayText(conn.instanceName, externalContactId, text)
        return { delivered: true, reason: null }
      }
      if (isChannelConfigured('whatsapp')) {
        await sendWhatsApp(externalContactId, text)
        return { delivered: true, reason: null }
      }
      return { delivered: false, reason: 'whatsapp channel is not connected' }
    }

    if (!isChannelConfigured(channel)) {
      return { delivered: false, reason: `${channel} channel is not connected` }
    }
    if (channel === 'instagram') await sendInstagram(externalContactId, text)
    else if (channel === 'line') await sendLine(externalContactId, text)
    else return { delivered: false, reason: `No sender for channel: ${channel}` }
    return { delivered: true, reason: null }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Delivery failed'
    console.error(`[transport] ${channel} delivery failed:`, error)
    return { delivered: false, reason }
  }
}
