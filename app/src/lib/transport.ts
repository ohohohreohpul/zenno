import { sendWhatsApp } from './channels/whatsapp'
import { sendInstagram } from './channels/instagram'
import { sendLine } from './channels/line'

/**
 * Unified outbound delivery. Attempts to transmit a message through the
 * contact's channel. Missing credentials or provider errors never throw —
 * the message is already persisted; delivery is best-effort and reported.
 */

export interface DeliveryResult {
  delivered: boolean
  reason: string | null
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

export async function deliverMessage(
  channel: string,
  externalContactId: string,
  text: string,
): Promise<DeliveryResult> {
  if (!isChannelConfigured(channel)) {
    return { delivered: false, reason: `${channel} channel is not connected` }
  }

  try {
    if (channel === 'whatsapp') await sendWhatsApp(externalContactId, text)
    else if (channel === 'instagram') await sendInstagram(externalContactId, text)
    else if (channel === 'line') await sendLine(externalContactId, text)
    else return { delivered: false, reason: `No sender for channel: ${channel}` }
    return { delivered: true, reason: null }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Delivery failed'
    return { delivered: false, reason }
  }
}
