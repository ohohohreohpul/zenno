/**
 * LINE Messaging API. Credentials are per-workspace (stored on the
 * ChannelConnection) with env vars as a single-tenant fallback.
 *
 * Contacts are keyed by LINE userId and replies go through the Push API —
 * reply tokens are single-use and expire, so they are never stored.
 */

const BASE_URL = 'https://api.line.me/v2/bot'

export async function sendLinePush(
  accessToken: string,
  userId: string,
  text: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LINE push failed: ${res.status} ${body}`)
  }
}

/** Env-fallback sender used when a workspace has no stored credentials. */
export async function sendLine(userId: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set')
  await sendLinePush(token, userId, text)
}

/** Validate an access token by asking LINE for the bot's info. */
export async function validateLineToken(accessToken: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`LINE rejected the access token (${res.status})`)
  }
  const info = (await res.json().catch(() => ({}))) as { displayName?: string }
  return info.displayName ?? 'LINE bot'
}

export function verifyLineSignatureWith(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
  try {
    return timingSafeEqual(Buffer.from(signature, 'base64'), Buffer.from(expected, 'base64'))
  } catch {
    return false
  }
}

/** Env-fallback verification. */
export function verifyLineSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return false
  return verifyLineSignatureWith(secret, rawBody, signature)
}
import { createHmac, timingSafeEqual } from 'crypto'
