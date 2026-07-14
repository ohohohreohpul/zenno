import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnection } from '@/lib/queries'
import { handleIncoming } from '@/lib/conversation'
import { workspaceIdFrom } from '@/lib/channels/connection-helpers'

/**
 * Telegram bot webhook. Registered per workspace as
 * /api/webhooks/telegram?workspaceId=... with a secret_token — Telegram
 * echoes it back in the X-Telegram-Bot-Api-Secret-Token header, which is
 * how we authenticate the request.
 */

interface TelegramUpdate {
  message?: {
    text?: string
    chat?: { id?: number | string; type?: string }
    from?: { first_name?: string; last_name?: string; is_bot?: boolean }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const conn = await getChannelConnection(workspaceId, 'telegram') as { status: string; credentials?: { webhookSecret?: string } } | null
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json({ status: 'no connection' })
    }

    const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? ''
    if (!conn.credentials?.webhookSecret || secret !== conn.credentials.webhookSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const msg = update.message
    const chatId = msg?.chat?.id
    const text = msg?.text
    // Private chats only — group support is a deliberate later decision.
    if (!msg || msg.from?.is_bot || !chatId || !text || msg.chat?.type !== 'private') {
      return NextResponse.json({ status: 'ignored' })
    }

    const name = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || null
    try {
      await handleIncoming(workspaceId, {
        channel: 'telegram',
        external_contact_id: String(chatId),
        contact_name: name,
        content: text,
        raw: update,
      })
    } catch (error: unknown) {
      console.error('[webhook:telegram] message handling failed:', error)
    }
    return NextResponse.json({ status: 'ok' })
  } catch (error: unknown) {
    console.error('[webhook:telegram] failed:', error)
    return NextResponse.json({ status: 'error' })
  }
}
