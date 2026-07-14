import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import { validatePageToken } from '@/lib/channels/messenger'
import {
  appBaseUrl,
  connectionInstanceName,
  workspaceIdFrom,
} from '@/lib/channels/connection-helpers'
import { MESSENGER_VERIFY_TOKEN } from '@/lib/channels/messenger-verify'

/**
 * Messenger channel connection. The business pastes a Page access token
 * (from their Meta app) — we validate it, capture the page id, and show
 * the webhook URL + verify token to configure in the Meta app dashboard.
 */

function payload(workspaceId: string, status: 'connected' | 'disconnected', pageName: string | null = null) {
  const base = appBaseUrl()
  return {
    data: {
      status,
      page_name: pageName,
      webhook_url: base ? `${base}/api/webhooks/messenger` : null,
      verify_token: MESSENGER_VERIFY_TOKEN,
    },
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  try {
    const conn = await getChannelConnection(workspaceId, 'messenger') as { id: string; status: string; credentials?: { botUsername?: string } } | null
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json(payload(workspaceId, 'disconnected'))
    }
    return NextResponse.json(payload(workspaceId, 'connected', conn.credentials?.botUsername ?? null))
  } catch (error: unknown) {
    console.error('[channels:messenger] status failed:', error)
    return NextResponse.json({ error: 'Could not load status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let body: { page_access_token?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const token = typeof body.page_access_token === 'string' ? body.page_access_token.trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'page_access_token is required' }, { status: 400 })
  }

  try {
    const { pageId, pageName } = await validatePageToken(token)

    await upsertChannelConnection(workspaceId, 'messenger', {
          status: 'connected',
          instanceName: connectionInstanceName('messenger', workspaceId),
          credentials: { pageAccessToken: token, pageId, botUsername: pageName },
    })
    return NextResponse.json(payload(workspaceId, 'connected', pageName))
  } catch (error: unknown) {
    console.error('[channels:messenger] connect failed:', error)
    const message = error instanceof Error ? error.message : 'Connect failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  try {
    const conn = await getChannelConnection(workspaceId, 'messenger') as { id: string } | null
    if (conn) await updateChannelConnection(conn.id, { status: 'disconnected', credentials: { pageAccessToken: null, pageId: null } })
    return NextResponse.json(payload(workspaceId, 'disconnected'))
  } catch (error: unknown) {
    console.error('[channels:messenger] disconnect failed:', error)
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
