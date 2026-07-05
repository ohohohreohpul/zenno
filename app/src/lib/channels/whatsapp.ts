const BASE_URL = 'https://waba.360dialog.io/v1'

export async function sendWhatsApp(to: string, text: string): Promise<void> {
  const apiKey = process.env.WHATSAPP_API_KEY
  if (!apiKey) throw new Error('WHATSAPP_API_KEY is not set')

  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'D360-API-KEY': apiKey,
    },
    body: JSON.stringify({
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`WhatsApp send failed: ${res.status} ${body}`)
  }
}

export function verifyWhatsAppSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET
  if (!secret) return false

  const crypto = require('crypto') as typeof import('crypto')
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex'),
  )
}
