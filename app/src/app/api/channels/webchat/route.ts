import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import {
  appBaseUrl,
  connectionInstanceName,
  randomSecret,
  workspaceIdFrom,
} from '@/lib/channels/connection-helpers'
import {
  normalizeWidgetSettings,
  type WebchatWidgetSettings,
} from '@/lib/channels/webchat-widget'
import type { IChannelCredentials } from '@/models/ChannelConnection'

/**
 * Web chat channel: enabling it mints a public embed key and the script
 * snippet to paste into any website.
 *   GET    → status + embed snippet + widget settings
 *   POST   → enable (or rotate the key with {rotate: true})
 *   PATCH  → save widget appearance settings
 *   DELETE → disable the widget
 */

function embedSnippet(embedKey: string): string {
  const base = appBaseUrl() ?? ''
  return `<script src="${base}/widget.js" data-key="${embedKey}" async></script>`
}

function payload(status: 'connected' | 'disconnected', credentials: IChannelCredentials | null) {
  const embedKey = credentials?.embedKey ?? null
  return {
    data: {
      status,
      embed_key: embedKey,
      snippet: embedKey ? embedSnippet(embedKey) : null,
      widget: normalizeWidgetSettings(credentials?.widgetSettings),
    },
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'webchat') as { id: string; status: string; credentials?: IChannelCredentials } | null
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json(payload('disconnected', null))
    }
    return NextResponse.json(payload('connected', conn.credentials ?? null))
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
    const existing = await getChannelConnection(workspaceId, 'webchat') as { credentials?: IChannelCredentials } | null
    const embedKey =
      !rotate && existing?.credentials?.embedKey
        ? existing.credentials.embedKey
        : `wc_${randomSecret(16)}`

    const conn = await upsertChannelConnection(workspaceId, 'webchat', {
          status: 'connected',
          instanceName: connectionInstanceName('webchat', workspaceId),
          credentials: { ...(existing?.credentials ?? {}), embedKey },
    }) as { credentials?: IChannelCredentials }
    return NextResponse.json(payload('connected', conn.credentials ?? { embedKey }))
  } catch (error: unknown) {
    console.error('[channels:webchat] enable failed:', error)
    return NextResponse.json({ error: 'Could not enable web chat' }, { status: 500 })
  }
}

const widgetSettingsSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'accentColor must be a #rrggbb hex color').optional(),
  title: z.string().trim().min(1).max(40).optional(),
  subtitle: z.string().trim().max(60).optional(),
  greeting: z.string().trim().max(200).optional(),
  position: z.enum(['right', 'left']).optional(),
})

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = widgetSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings' }, { status: 422 })
  }

  try {
    const conn = await getChannelConnection(workspaceId, 'webchat') as { id: string; status: string; credentials?: IChannelCredentials } | null
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json({ error: 'Enable web chat first' }, { status: 404 })
    }

    const merged: WebchatWidgetSettings = normalizeWidgetSettings({
      ...normalizeWidgetSettings(conn.credentials?.widgetSettings),
      ...parsed.data,
    })
    const updated = await updateChannelConnection(conn.id, {
      credentials: { ...(conn.credentials ?? {}), widgetSettings: merged },
    }) as { credentials?: IChannelCredentials }
    return NextResponse.json(payload('connected', updated.credentials ?? null))
  } catch (error: unknown) {
    console.error('[channels:webchat] widget settings update failed:', error)
    return NextResponse.json({ error: 'Could not save widget settings' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const conn = await getChannelConnection(workspaceIdFrom(req), 'webchat') as { id: string; credentials?: IChannelCredentials } | null
    if (conn) await updateChannelConnection(conn.id, { status: 'disconnected' })
    return NextResponse.json(payload('disconnected', null))
  } catch (error: unknown) {
    console.error('[channels:webchat] disable failed:', error)
    return NextResponse.json({ error: 'Could not disable web chat' }, { status: 500 })
  }
}
