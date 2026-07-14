import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnectionByPageId } from '@/lib/queries'
import { handleIncoming } from '@/lib/conversation'
import { MESSENGER_VERIFY_TOKEN } from '@/lib/channels/messenger-verify'

/**
 * Meta (Messenger) webhook — app-level. GET handles Meta's subscription
 * challenge; POST receives page messaging events, routed to workspaces by
 * page id (each workspace stores its page id when connecting).
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams
  if (
    params.get('hub.mode') === 'subscribe' &&
    params.get('hub.verify_token') === MESSENGER_VERIFY_TOKEN
  ) {
    return new NextResponse(params.get('hub.challenge') ?? '', { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

interface MessengerEvent {
  sender?: { id?: string }
  message?: { text?: string; is_echo?: boolean }
}

interface MessengerEntry {
  id?: string
  messaging?: MessengerEvent[]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: { object?: string; entry?: MessengerEntry[] }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (payload.object !== 'page') return NextResponse.json({ status: 'ignored' })

  try {
    for (const entry of payload.entry ?? []) {
      const pageId = entry.id
      if (!pageId) continue

      const conn = await getChannelConnectionByPageId(pageId) as { workspaceId: string } | null
      if (!conn) continue

      for (const event of entry.messaging ?? []) {
        const senderId = event.sender?.id
        const text = event.message?.text
        // Skip echoes of our own sends and any sender that is the page itself.
        if (!senderId || !text || event.message?.is_echo || senderId === pageId) continue

        try {
          await handleIncoming(conn.workspaceId, {
            channel: 'messenger',
            external_contact_id: senderId,
            contact_name: null,
            content: text,
            raw: event,
          })
        } catch (error: unknown) {
          console.error('[webhook:messenger] message handling failed:', error)
        }
      }
    }
    return NextResponse.json({ status: 'ok' })
  } catch (error: unknown) {
    console.error('[webhook:messenger] failed:', error)
    return NextResponse.json({ status: 'error' })
  }
}
