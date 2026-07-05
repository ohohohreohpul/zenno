import { NextRequest, NextResponse } from 'next/server'
import { verifyLineSignature, sendLine } from '@/lib/channels/line'
import { handleIncoming } from '@/lib/conversation'
import type { IncomingMessage } from '@/types'

const WORKSPACE_ID_HEADER = 'x-workspace-id'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifyLineSignature(rawBody, signature)) {
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

  const { messages, replyTokens } = extractLineMessages(payload)

  await Promise.all(
    messages.map((msg, i) =>
      handleIncomingLine(workspaceId, msg, replyTokens[i]),
    ),
  )

  return NextResponse.json({ status: 'ok' })
}

async function handleIncomingLine(
  workspaceId: string,
  incoming: IncomingMessage,
  replyToken: string,
): Promise<void> {
  // LINE uses reply tokens, not user IDs for sending — store replyToken as external_contact_id
  // The LINE push API (sendLine) accepts replyToken directly
  await handleIncoming(workspaceId, { ...incoming, external_contact_id: replyToken })
}

function extractLineMessages(payload: unknown): {
  messages: IncomingMessage[]
  replyTokens: string[]
} {
  const messages: IncomingMessage[] = []
  const replyTokens: string[] = []

  for (const event of (payload as any)?.events ?? []) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    messages.push({
      channel: 'line',
      external_contact_id: event.source?.userId ?? event.replyToken,
      contact_name: null,
      content: event.message.text,
      raw: event,
    })
    replyTokens.push(event.replyToken)
  }

  return { messages, replyTokens }
}
