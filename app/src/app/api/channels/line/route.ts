import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import { validateLineToken } from '@/lib/channels/line'
import {
  appBaseUrl,
  connectionInstanceName,
  workspaceIdFrom,
} from '@/lib/channels/connection-helpers'

/**
 * LINE channel connection. The business pastes their Messaging API channel
 * secret + access token (LINE Developers console) and sets our webhook URL
 * there — LINE has no API to register webhooks remotely, so we display it.
 */

function webhookUrlFor(workspaceId: string): string | null {
  const base = appBaseUrl()
  return base ? `${base}/api/webhooks/line?workspaceId=${encodeURIComponent(workspaceId)}` : null
}

function payload(
  workspaceId: string,
  status: 'connected' | 'disconnected',
  botName: string | null = null,
) {
  return {
    data: { status, bot_name: botName, webhook_url: webhookUrlFor(workspaceId) },
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  try {
    const conn = await getChannelConnection(workspaceId, 'line') as { id: string; status: string; credentials?: { botUsername?: string } } | null
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json(payload(workspaceId, 'disconnected'))
    }
    return NextResponse.json(payload(workspaceId, 'connected', conn.credentials?.botUsername ?? null))
  } catch (error: unknown) {
    console.error('[channels:line] status failed:', error)
    return NextResponse.json({ error: 'Could not load status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let body: { channel_secret?: unknown; channel_access_token?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const channelSecret = typeof body.channel_secret === 'string' ? body.channel_secret.trim() : ''
  const accessToken =
    typeof body.channel_access_token === 'string' ? body.channel_access_token.trim() : ''
  if (!channelSecret || !accessToken) {
    return NextResponse.json(
      { error: 'channel_secret and channel_access_token are required' },
      { status: 400 },
    )
  }

  try {
    const botName = await validateLineToken(accessToken)

    await upsertChannelConnection(workspaceId, 'line', {
          status: 'connected',
          instanceName: connectionInstanceName('line', workspaceId),
          credentials: { channelSecret, channelAccessToken: accessToken, botUsername: botName },
    })
    return NextResponse.json(payload(workspaceId, 'connected', botName))
  } catch (error: unknown) {
    console.error('[channels:line] connect failed:', error)
    const message = error instanceof Error ? error.message : 'Connect failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  try {
    const conn = await getChannelConnection(workspaceId, 'line') as { id: string } | null
    if (conn) await updateChannelConnection(conn.id, { status: 'disconnected', credentials: { channelSecret: null, channelAccessToken: null } })
    return NextResponse.json(payload(workspaceId, 'disconnected'))
  } catch (error: unknown) {
    console.error('[channels:line] disconnect failed:', error)
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
