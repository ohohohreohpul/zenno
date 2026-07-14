import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import {
  appBaseUrl,
  connectionInstanceName,
  randomSecret,
  workspaceIdFrom,
} from '@/lib/channels/connection-helpers'

/**
 * Web chat channel: enabling it mints a public embed key and the script
 * snippet to paste into any website.
 *   GET    → status + embed snippet
 *   POST   → enable (or rotate the key with {rotate: true})
 *   DELETE → disable the widget
 */

function embedSnippet(embedKey: string): string {
  const base = appBaseUrl() ?? ''
  return `<script src="${base}/widget.js" data-key="${embedKey}" async></script>`
}

function payload(status: 'connected' | 'disconnected', embedKey: string | null) {
  return {
    data: {
      status,
      embed_key: embedKey,
      snippet: embedKey ? embedSnippet(embedKey) : null,
    },
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'webchat') as { id: string; status: string; credentials?: { embedKey?: string } } | null
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json(payload('disconnected', null))
    }
    return NextResponse.json(payload('connected', conn.credentials?.embedKey ?? null))
  } catch (error: unknown) {
    console.error('[channels:webchat] status failed:', error)
    return NextResponse.json({ error: 'Could not load status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  let rotate = false
  try {
    const body = await req.json()
    rotate = body?.rotate === true
  } catch {
    // No body means plain enable.
  }

  try {
    const existing = await getChannelConnection(workspaceId, 'webchat') as { credentials?: { embedKey?: string } } | null
    const embedKey =
      !rotate && existing?.credentials?.embedKey
        ? existing.credentials.embedKey
        : `wc_${randomSecret(16)}`

    const conn = await upsertChannelConnection(workspaceId, 'webchat', {
          status: 'connected',
          instanceName: connectionInstanceName('webchat', workspaceId),
          credentials: { embedKey },
    }) as { credentials?: { embedKey?: string } }
    return NextResponse.json(payload('connected', conn.credentials?.embedKey ?? embedKey))
  } catch (error: unknown) {
    console.error('[channels:webchat] enable failed:', error)
    return NextResponse.json({ error: 'Could not enable web chat' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'webchat') as { id: string } | null
    if (conn) await updateChannelConnection(conn.id, { status: 'disconnected' })
    return NextResponse.json(payload('disconnected', null))
  } catch (error: unknown) {
    console.error('[channels:webchat] disable failed:', error)
    return NextResponse.json({ error: 'Could not disable web chat' }, { status: 500 })
  }
}
