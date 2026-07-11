import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import {
  appBaseUrl,
  connectionInstanceName,
  randomSecret,
  workspaceIdFrom,
} from '@/lib/channels/connection-helpers'
import { ChannelConnection } from '@/models/ChannelConnection'

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
    await connectDb()
    const conn = await ChannelConnection.findOne({
      workspaceId: workspaceIdFrom(req),
      channel: 'webchat',
    }).lean()
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
    await connectDb()
    const existing = await ChannelConnection.findOne({ workspaceId, channel: 'webchat' })
    const embedKey =
      !rotate && existing?.credentials?.embedKey
        ? existing.credentials.embedKey
        : `wc_${randomSecret(16)}`

    const conn = await ChannelConnection.findOneAndUpdate(
      { workspaceId, channel: 'webchat' },
      {
        $set: {
          status: 'connected',
          instanceName: connectionInstanceName('webchat', workspaceId),
          'credentials.embedKey': embedKey,
        },
      },
      { upsert: true, new: true },
    )
    return NextResponse.json(payload('connected', conn.credentials?.embedKey ?? embedKey))
  } catch (error: unknown) {
    console.error('[channels:webchat] enable failed:', error)
    return NextResponse.json({ error: 'Could not enable web chat' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDb()
    await ChannelConnection.updateOne(
      { workspaceId: workspaceIdFrom(req), channel: 'webchat' },
      { $set: { status: 'disconnected' } },
    )
    return NextResponse.json(payload('disconnected', null))
  } catch (error: unknown) {
    console.error('[channels:webchat] disable failed:', error)
    return NextResponse.json({ error: 'Could not disable web chat' }, { status: 500 })
  }
}
