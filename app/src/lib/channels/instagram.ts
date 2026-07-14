import { createHmac, timingSafeEqual } from 'crypto'

const BASE_URL = 'https://graph.facebook.com/v19.0'

export async function validateInstagramToken(pageAccessToken: string): Promise<{ pageId: string; pageName: string }> {
  const res = await fetch(`${BASE_URL}/me?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(pageAccessToken)}`)
  const body = await res.json().catch(() => ({})) as {
    id?: string
    name?: string
    instagram_business_account?: { id?: string }
    error?: { message?: string }
  }
  if (!res.ok || !body.id) throw new Error(`Meta rejected the page token: ${body.error?.message ?? res.status}`)
  const pageId = body.instagram_business_account?.id ?? body.id
  return { pageId, pageName: body.name ?? 'Instagram Business' }
}

export async function sendInstagram(pageAccessToken: string, recipientId: string, text: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Instagram send failed: ${res.status} ${body.slice(0, 300)}`)
  }
}

export function verifyMetaSignature(rawBody: string, signature: string, appSecret: string): boolean {
  if (!appSecret || !signature.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const provided = signature.slice('sha256='.length)
  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
