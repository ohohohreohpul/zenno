import { NextRequest, NextResponse } from 'next/server'
import {
  connectMetaPage,
  fetchPages,
  isMetaOAuthConfigured,
  type MetaChannel,
} from '@/lib/channels/meta-oauth'
import { workspaceIdFrom } from '@/lib/channels/connection-helpers'
import { getChannelConnection } from '@/lib/queries'

/**
 * Page picker for the Meta OAuth flow.
 *   GET  → oauth availability + pages selectable with the parked user token
 *   POST → finalize the chosen page for the channel
 */

function channelParam(value: string | null): MetaChannel | null {
  return value === 'messenger' || value === 'instagram' ? value : null
}

async function pendingToken(workspaceId: string, channel: MetaChannel): Promise<string | null> {
  const conn = await getChannelConnection(workspaceId, channel) as {
    status?: string
    credentials?: { userAccessToken?: string | null }
  } | null
  if (!conn || conn.status === 'connected') return null
  return conn.credentials?.userAccessToken ?? null
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const channel = channelParam(req.nextUrl.searchParams.get('channel'))
  if (!channel) return NextResponse.json({ error: 'channel must be messenger or instagram' }, { status: 400 })

  try {
    const oauthConfigured = isMetaOAuthConfigured()
    if (!oauthConfigured) return NextResponse.json({ data: { oauth_configured: false, pages: [] } })

    const token = await pendingToken(workspaceIdFrom(req), channel)
    if (!token) return NextResponse.json({ data: { oauth_configured: true, pages: [] } })

    const pages = await fetchPages(token)
    return NextResponse.json({
      data: {
        oauth_configured: true,
        pages: pages.map((p) => ({
          id: p.id,
          name: p.name,
          instagram_username: p.instagramUsername,
          instagram_linked: Boolean(p.instagramId),
        })),
      },
    })
  } catch (error: unknown) {
    console.error('[meta-oauth] pages lookup failed:', error)
    return NextResponse.json({ error: 'Could not load Facebook Pages — reconnect with Facebook' }, { status: 502 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { channel?: unknown; page_id?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const channel = channelParam(typeof body.channel === 'string' ? body.channel : null)
  const pageId = typeof body.page_id === 'string' ? body.page_id : ''
  if (!channel || !pageId) {
    return NextResponse.json({ error: 'channel and page_id are required' }, { status: 400 })
  }

  const workspaceId = workspaceIdFrom(req)
  try {
    const token = await pendingToken(workspaceId, channel)
    if (!token) return NextResponse.json({ error: 'No pending authorization — click Connect with Facebook first' }, { status: 409 })

    const pages = await fetchPages(token)
    const page = pages.find((p) => p.id === pageId)
    if (!page) return NextResponse.json({ error: 'That Page is not on the authorized account' }, { status: 404 })

    const { displayName } = await connectMetaPage(workspaceId, channel, page)
    return NextResponse.json({ data: { status: 'connected', page_name: displayName } })
  } catch (error: unknown) {
    console.error('[meta-oauth] page select failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not connect the Page' }, { status: 502 })
  }
}
