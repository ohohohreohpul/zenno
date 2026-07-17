import { createHash } from 'crypto'
import { after, NextRequest, NextResponse } from 'next/server'
import { handleIncoming } from '@/lib/conversation'
import { claimWebhookEvent, getChannelConnectionByZernioAccountId } from '@/lib/queries'
import { makeZernioRecipient, verifyZernioWebhook } from '@/lib/channels/zernio'
import type { IncomingMedia } from '@/types'

export const maxDuration = 60

interface ZernioWebhookPayload {
  id?: string
  event?: string
  message?: {
    id?: string
    direction?: string
    text?: string | null
    attachments?: Array<{ type?: string; url?: string }>
    sender?: { id?: string; name?: string; username?: string }
  }
  conversation?: { id?: string }
  account?: { id?: string; accountId?: string; platform?: string }
}

function mediaType(value: string | undefined): IncomingMedia['type'] {
  if (value === 'audio' || value === 'video' || value === 'image') return value
  return 'document'
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const signature = req.headers.get('x-zernio-signature') ?? req.headers.get('x-late-signature') ?? ''
  if (!verifyZernioWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: ZernioWebhookPayload
  try { payload = JSON.parse(rawBody) as ZernioWebhookPayload } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (payload.event === 'webhook.test') return NextResponse.json({ status: 'ok' })
  if (payload.event !== 'message.received' || payload.message?.direction !== 'incoming') {
    return NextResponse.json({ status: 'ignored' })
  }

  const accountId = payload.account?.accountId ?? payload.account?.id ?? ''
  const conversationId = payload.conversation?.id ?? ''
  const senderId = payload.message?.sender?.id ?? ''
  const platform = payload.account?.platform
  if (!accountId || !conversationId || !senderId || (platform !== 'facebook' && platform !== 'instagram')) {
    return NextResponse.json({ error: 'Incomplete inbox event' }, { status: 400 })
  }

  const channel = platform === 'facebook' ? 'messenger' : 'instagram'
  const connection = await getChannelConnectionByZernioAccountId(accountId, channel) as { workspaceId?: string } | null
  if (!connection?.workspaceId) return NextResponse.json({ error: 'Unknown connected account' }, { status: 404 })

  const eventId = payload.id ?? createHash('sha256').update(`${accountId}:${payload.message?.id ?? rawBody}`).digest('hex')
  if (!(await claimWebhookEvent(eventId, 'zernio', payload.event))) {
    return NextResponse.json({ status: 'duplicate' })
  }

  const media = (payload.message?.attachments ?? [])
    .filter((attachment) => Boolean(attachment.url))
    .map((attachment) => ({ type: mediaType(attachment.type), url: attachment.url! }))
  const content = payload.message?.text ?? ''
  const contactName = payload.message?.sender?.name ?? payload.message?.sender?.username ?? null

  after(async () => {
    try {
      await handleIncoming(connection.workspaceId!, {
        channel,
        external_contact_id: makeZernioRecipient(accountId, conversationId),
        contact_name: contactName,
        content,
        media,
        raw: payload,
      })
    } catch (error: unknown) {
      console.error('[webhook:zernio] message handling failed:', error)
    }
  })

  return NextResponse.json({ status: 'accepted' })
}
