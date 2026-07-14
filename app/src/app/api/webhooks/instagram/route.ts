import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaSignature } from '@/lib/channels/instagram'
import { getChannelConnectionByPageId, getChannelConnectionByVerifyToken } from '@/lib/queries'
import { handleIncoming } from '@/lib/conversation'
import type { IncomingMessage } from '@/types'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams
  const token = params.get('hub.verify_token') ?? ''
  const conn = await getChannelConnectionByVerifyToken(token, 'instagram')
  if (params.get('hub.mode') === 'subscribe' && conn) return new NextResponse(params.get('hub.challenge') ?? '', { status: 200 })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

interface InstagramMessaging { sender?: { id?: string }; message?: { text?: string; is_echo?: boolean } }
interface InstagramEntry { id?: string; messaging?: InstagramMessaging[] }

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  let payload: { entry?: InstagramEntry[] }
  try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  for (const entry of payload.entry ?? []) {
    if (!entry.id) continue
    const conn = await getChannelConnectionByPageId(entry.id, 'instagram') as { workspaceId: string; credentials?: { appSecret?: string } } | null
    const appSecret = conn?.credentials?.appSecret
    if (!conn || !appSecret || !verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256') ?? '', appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const messages = extractInstagramMessages(entry)
    await Promise.all(messages.map((message) => handleIncoming(conn.workspaceId, message)))
  }
  return NextResponse.json({ status: 'ok' })
}

function extractInstagramMessages(entry: InstagramEntry): IncomingMessage[] {
  const results: IncomingMessage[] = []
  for (const messaging of entry.messaging ?? []) {
    const text = messaging.message?.text
    const senderId = messaging.sender?.id
    if (!text || !senderId || messaging.message?.is_echo) continue
    results.push({ channel: 'instagram', external_contact_id: senderId, contact_name: null, content: text, raw: messaging })
  }
  return results
}
