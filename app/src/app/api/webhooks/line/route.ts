import { NextRequest, NextResponse } from 'next/server'
import { verifyLineSignature, verifyLineSignatureWith } from '@/lib/channels/line'
import { handleIncoming } from '@/lib/conversation'
import { connectDb } from '@/lib/db'
import { workspaceIdFrom } from '@/lib/channels/connection-helpers'
import { ChannelConnection } from '@/models/ChannelConnection'
import type { IncomingMessage } from '@/types'

/**
 * LINE webhook. Registered per workspace as /api/webhooks/line?workspaceId=…
 * (set this URL in the LINE Developers console). Signature is verified with
 * the workspace's stored channel secret, falling back to the env secret.
 * Contacts are keyed by LINE userId; replies go out via the Push API.
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''
  const workspaceId = req.headers.get('x-workspace-id') ?? workspaceIdFrom(req)

  let verified = false
  try {
    await connectDb()
    const conn = await ChannelConnection.findOne({ workspaceId, channel: 'line' }).lean()
    const secret = conn?.credentials?.channelSecret
    if (secret) verified = verifyLineSignatureWith(secret, rawBody, signature)
  } catch (error: unknown) {
    console.error('[webhook:line] connection lookup failed:', error)
  }
  if (!verified) verified = verifyLineSignature(rawBody, signature)
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = extractLineMessages(payload)

  for (const msg of messages) {
    try {
      await handleIncoming(workspaceId, msg)
    } catch (error: unknown) {
      console.error('[webhook:line] message handling failed:', error)
    }
  }

  return NextResponse.json({ status: 'ok' })
}

interface LineEvent {
  type?: string
  replyToken?: string
  source?: { userId?: string }
  message?: { type?: string; text?: string }
}

function extractLineMessages(payload: unknown): IncomingMessage[] {
  const events = ((payload as { events?: LineEvent[] })?.events ?? [])
  const messages: IncomingMessage[] = []

  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue
    const userId = event.source?.userId
    const text = event.message.text
    if (!userId || !text) continue

    messages.push({
      channel: 'line',
      external_contact_id: userId,
      contact_name: null,
      content: text,
      raw: event,
    })
  }

  return messages
}
