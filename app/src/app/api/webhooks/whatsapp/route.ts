import { NextRequest, NextResponse } from 'next/server'
import { verifyWhatsAppSignature } from '@/lib/channels/whatsapp'
import { handleIncoming } from '@/lib/conversation'
import type { IncomingMessage } from '@/types'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()

  // Signature verification is enforced when WHATSAPP_WEBHOOK_SECRET is set.
  // 360dialog does not sign webhooks by default, so an unset secret means
  // "accept" — set the secret as soon as the provider supports it.
  if (process.env.WHATSAPP_WEBHOOK_SECRET) {
    const signature = req.headers.get('x-hub-signature-256') ?? ''
    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const workspaceId =
    req.nextUrl.searchParams.get('workspaceId') ??
    req.headers.get('x-workspace-id') ??
    DEFAULT_WORKSPACE_ID

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = extractWhatsAppMessages(payload)

  // Process sequentially so replies keep conversational order per contact.
  for (const msg of messages) {
    try {
      await handleIncoming(workspaceId, msg)
    } catch (error: unknown) {
      // A failure on one message must not fail the webhook — the provider
      // would retry the whole batch and duplicate the others.
      console.error('[webhook:whatsapp] message handling failed:', error)
    }
  }

  return NextResponse.json({ status: 'ok', received: messages.length })
}

interface WhatsAppMessage {
  type?: string
  from?: string
  text?: { body?: string }
  image?: { id?: string; url?: string; caption?: string; mime_type?: string }
  audio?: { id?: string; url?: string; mime_type?: string }
  video?: { id?: string; url?: string; caption?: string; mime_type?: string }
  document?: { id?: string; url?: string; caption?: string; mime_type?: string; filename?: string }
}

interface WhatsAppContactInfo {
  wa_id?: string
  profile?: { name?: string }
}

function extractWhatsAppMessages(payload: unknown): IncomingMessage[] {
  const results: IncomingMessage[] = []
  const root = payload as {
    entry?: { changes?: { value?: { messages?: WhatsAppMessage[]; contacts?: WhatsAppContactInfo[] } }[] }[]
    // 360dialog also posts a flat shape: { messages: [...], contacts: [...] }
    messages?: WhatsAppMessage[]
    contacts?: WhatsAppContactInfo[]
  }

  const batches: { messages?: WhatsAppMessage[]; contacts?: WhatsAppContactInfo[] }[] = []
  for (const entry of root?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.value) batches.push(change.value)
    }
  }
  if (root?.messages) batches.push({ messages: root.messages, contacts: root.contacts })

  for (const batch of batches) {
    for (const msg of batch.messages ?? []) {
      if (!msg.from) continue
      const contact = batch.contacts?.find((c) => c.wa_id === msg.from)
      const text = msg.type === 'text' ? msg.text?.body ?? '' : ''
      const media: IncomingMessage['media'] = []

      if (msg.type === 'audio' && msg.audio?.url) {
        media.push({ type: 'audio', url: msg.audio.url, mime: msg.audio.mime_type })
      } else if (msg.type === 'image' && msg.image?.url) {
        media.push({ type: 'image', url: msg.image.url, mime: msg.image.mime_type, caption: msg.image.caption })
      } else if (msg.type === 'video' && msg.video?.url) {
        media.push({ type: 'video', url: msg.video.url, mime: msg.video.mime_type, caption: msg.video.caption })
      } else if (msg.type === 'document' && msg.document?.url) {
        media.push({ type: 'document', url: msg.document.url, mime: msg.document.mime_type, caption: msg.document.caption ?? msg.document.filename })
      } else if (msg.type !== 'text') {
        // Unknown / unsupported message type — skip so we don't reply to
        // reactions, statuses, or system events as if they were customer text.
        continue
      }

      if (!text && media.length === 0) continue

      results.push({
        channel: 'whatsapp',
        external_contact_id: msg.from,
        contact_name: contact?.profile?.name ?? null,
        content: text,
        media: media.length > 0 ? media : undefined,
        raw: msg,
      })
    }
  }

  return results
}
