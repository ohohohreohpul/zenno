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
    } catch {
      // A failure on one message must not fail the webhook — the provider
      // would retry the whole batch and duplicate the others.
    }
  }

  return NextResponse.json({ status: 'ok', received: messages.length })
}

interface WhatsAppTextMessage {
  type?: string
  from?: string
  text?: { body?: string }
}

interface WhatsAppContactInfo {
  wa_id?: string
  profile?: { name?: string }
}

function extractWhatsAppMessages(payload: unknown): IncomingMessage[] {
  const results: IncomingMessage[] = []
  const root = payload as {
    entry?: { changes?: { value?: { messages?: WhatsAppTextMessage[]; contacts?: WhatsAppContactInfo[] } }[] }[]
    // 360dialog also posts a flat shape: { messages: [...], contacts: [...] }
    messages?: WhatsAppTextMessage[]
    contacts?: WhatsAppContactInfo[]
  }

  const batches: { messages?: WhatsAppTextMessage[]; contacts?: WhatsAppContactInfo[] }[] = []
  for (const entry of root?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.value) batches.push(change.value)
    }
  }
  if (root?.messages) batches.push({ messages: root.messages, contacts: root.contacts })

  for (const batch of batches) {
    for (const msg of batch.messages ?? []) {
      if (msg.type !== 'text' || !msg.from || !msg.text?.body) continue
      const contact = batch.contacts?.find((c) => c.wa_id === msg.from)
      results.push({
        channel: 'whatsapp',
        external_contact_id: msg.from,
        contact_name: contact?.profile?.name ?? null,
        content: msg.text.body,
        raw: msg,
      })
    }
  }

  return results
}
