import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import { validateInstagramToken } from '@/lib/channels/instagram'
import { appBaseUrl, connectionInstanceName, workspaceIdFrom } from '@/lib/channels/connection-helpers'

function payload(status: 'connected' | 'disconnected', pageName: string | null = null, verifyToken: string | null = null) {
  const base = appBaseUrl()
  return { data: { status, page_name: pageName, webhook_url: base ? `${base}/api/webhooks/instagram` : null, verify_token: verifyToken } }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'instagram') as { status: string; credentials?: { botUsername?: string; verifyToken?: string } } | null
    if (!conn || conn.status !== 'connected') return NextResponse.json(payload('disconnected'))
    return NextResponse.json(payload('connected', conn.credentials?.botUsername ?? null, conn.credentials?.verifyToken ?? null))
  } catch (error) {
    console.error('[channels:instagram] status failed:', error)
    return NextResponse.json({ error: 'Could not load status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  let body: { page_access_token?: unknown; app_secret?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const pageAccessToken = typeof body.page_access_token === 'string' ? body.page_access_token.trim() : ''
  const appSecret = typeof body.app_secret === 'string' ? body.app_secret.trim() : ''
  if (!pageAccessToken || !appSecret) return NextResponse.json({ error: 'page_access_token and app_secret are required' }, { status: 400 })

  try {
    const { pageId, pageName } = await validateInstagramToken(pageAccessToken)
    const verifyToken = randomBytes(24).toString('base64url')
    await upsertChannelConnection(workspaceId, 'instagram', {
      status: 'connected',
      instanceName: connectionInstanceName('instagram', workspaceId),
      credentials: { pageAccessToken, pageId, appSecret, verifyToken, botUsername: pageName },
    })
    return NextResponse.json(payload('connected', pageName, verifyToken))
  } catch (error) {
    console.error('[channels:instagram] connect failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Connect failed' }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'instagram') as { id: string } | null
    if (conn) await updateChannelConnection(conn.id, { status: 'disconnected', credentials: { pageAccessToken: null, appSecret: null, verifyToken: null, pageId: null } })
    return NextResponse.json(payload('disconnected'))
  } catch (error) {
    console.error('[channels:instagram] disconnect failed:', error)
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
