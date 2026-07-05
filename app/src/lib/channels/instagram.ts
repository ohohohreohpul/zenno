const BASE_URL = 'https://graph.facebook.com/v19.0'

export async function sendInstagram(recipientId: string, text: string): Promise<void> {
  const token = process.env.META_PAGE_ACCESS_TOKEN
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN is not set')

  const res = await fetch(`${BASE_URL}/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Instagram send failed: ${res.status} ${body}`)
  }
}

export function verifyMetaSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret) return false

  const crypto = require('crypto') as typeof import('crypto')
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  const provided = signature.replace('sha256=', '')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}
