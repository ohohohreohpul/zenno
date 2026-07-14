import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaSignature } from '@/lib/channels/instagram'
import { handleIncoming } from '@/lib/conversation'
import type { IncomingMessage } from '@/types'

const WORKSPACE_ID_HEADER = 'x-workspace-id'

// Meta webhook verification handshake
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''

  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const workspaceId = req.headers.get(WORKSPACE_ID_HEADER)
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace id' }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = extractInstagramMessages(payload)

  await Promise.all(
    messages.map((msg) => handleIncoming(workspaceId, msg)),
  )

  return NextResponse.json({ status: 'ok' })
}

function extractInstagramMessages(payload: unknown): IncomingMessage[] {
  const results: IncomingMessage[] = []

  interface InstagramMessaging { sender?: { id?: string }; message?: { text?: string; is_echo?: boolean } }
  interface InstagramEntry { messaging?: InstagramMessaging[] }
  const entries = (payload as { entry?: InstagramEntry[] } | null)?.entry ?? []
  for (const entry of entries) {
    for (const messaging of entry?.messaging ?? []) {
      const text = messaging?.message?.text
      const senderId = messaging.sender?.id
      if (!text || !senderId || messaging?.message?.is_echo) continue

      results.push({
        channel: 'instagram',
        external_contact_id: senderId,
        contact_name: null,
        content: text,
        raw: messaging,
      })
    }
  }

  return results
}
