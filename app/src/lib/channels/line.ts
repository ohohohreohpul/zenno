const BASE_URL = 'https://api.line.me/v2/bot'

export async function sendLine(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set')

  const res = await fetch(`${BASE_URL}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LINE send failed: ${res.status} ${body}`)
  }
}

export function verifyLineSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return false

  const crypto = require('crypto') as typeof import('crypto')
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expected, 'base64'),
    )
  } catch {
    return false
  }
}
