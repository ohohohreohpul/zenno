import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import {
  registerTelegramWebhook,
  removeTelegramWebhook,
  validateBotToken,
} from '@/lib/channels/telegram'
import {
  appBaseUrl,
  connectionInstanceName,
  randomSecret,
  workspaceIdFrom,
} from '@/lib/channels/connection-helpers'

/**
 * Telegram channel connection.
 *   GET    → status
 *   POST   → { bot_token } — validate with getMe, register webhook, store
 *   DELETE → remove webhook + credentials
 */

interface StatusPayload {
  status: 'connected' | 'disconnected'
  bot_username: string | null
}

function payload(status: 'connected' | 'disconnected', botUsername: string | null = null): { data: StatusPayload } {
  return { data: { status, bot_username: botUsername } }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'telegram') as { id: string; status: string; credentials?: { botUsername?: string } } | null
    if (!conn || conn.status !== 'connected') return NextResponse.json(payload('disconnected'))
    return NextResponse.json(payload('connected', conn.credentials?.botUsername ?? null))
  } catch (error: unknown) {
    console.error('[channels:telegram] status failed:', error)
    return NextResponse.json({ error: 'Could not load status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let body: { bot_token?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const botToken = typeof body.bot_token === 'string' ? body.bot_token.trim() : ''
  if (!/^\d+:[\w-]{30,}$/.test(botToken)) {
    return NextResponse.json(
      { error: 'That does not look like a bot token — copy it from @BotFather' },
      { status: 400 },
    )
  }

  try {
    const botUsername = await validateBotToken(botToken)

    const base = appBaseUrl()
    if (!base) {
      return NextResponse.json(
        { error: 'PUBLIC_APP_URL is not configured — cannot register the webhook' },
        { status: 503 },
      )
    }
    const webhookSecret = randomSecret()
    await registerTelegramWebhook(
      botToken,
      `${base}/api/webhooks/telegram?workspaceId=${encodeURIComponent(workspaceId)}`,
      webhookSecret,
    )

    const conn = await upsertChannelConnection(workspaceId, 'telegram', {
          status: 'connected',
          instanceName: connectionInstanceName('telegram', workspaceId),
          credentials: { botToken, botUsername, webhookSecret },
    }) as { credentials?: { botUsername?: string } }
    return NextResponse.json(payload('connected', conn.credentials?.botUsername ?? botUsername))
  } catch (error: unknown) {
    console.error('[channels:telegram] connect failed:', error)
    const message = error instanceof Error ? error.message : 'Connect failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  try {
    const conn = await getChannelConnection(workspaceId, 'telegram') as { id: string; credentials?: { botToken?: string } } | null
    if (!conn) return NextResponse.json(payload('disconnected'))

    const botToken = conn.credentials?.botToken
    if (botToken) {
      try {
        await removeTelegramWebhook(botToken)
      } catch (error: unknown) {
        console.error('[channels:telegram] webhook removal failed:', error)
      }
    }

    await updateChannelConnection(conn.id, { status: 'disconnected', credentials: { botToken: null, webhookSecret: null } })
    return NextResponse.json(payload('disconnected'))
  } catch (error: unknown) {
    console.error('[channels:telegram] disconnect failed:', error)
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
