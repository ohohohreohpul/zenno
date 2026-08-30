import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnectionByInstance, updateChannelConnection } from '@/lib/queries'
import { handleIncoming } from '@/lib/conversation'
import type { IncomingMessage } from '@/types'

/**
 * Inbound webhook from the WAHA (WhatsApp HTTP API) session gateway.
 * Receives "message" (customer messages) and "session.status" (session
 * opened/closed) events, maps the gateway session back to its workspace,
 * and feeds messages into the shared conversation loop.
 *
 * When WAHA_WEBHOOK_TOKEN is set, requests must carry it as a `token`
 * query parameter — WAHA's webhook config doesn't support custom headers,
 * so unlike the old Evolution webhook this route only checks the query string.
 */

interface WahaMessagePayload {
  from?: string
  fromMe?: boolean
  body?: string
  hasMedia?: boolean
  notifyName?: string
  _data?: { notifyName?: string; pushName?: string }
}

interface WahaWebhookBody {
  event?: string
  session?: string
  payload?: WahaMessagePayload | { status?: string }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.WAHA_WEBHOOK_TOKEN
  if (process.env.NODE_ENV === 'production' && !expectedToken) {
    return NextResponse.json({ error: 'Webhook token is not configured' }, { status: 503 })
  }
  const suppliedToken = req.nextUrl.searchParams.get('token')
  if (expectedToken && suppliedToken !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let body: WahaWebhookBody
  try {
    body = (await req.json()) as WahaWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const instanceName = body.session
  if (!instanceName) return NextResponse.json({ status: 'ignored' })

  try {
    const conn = await getChannelConnectionByInstance(instanceName) as {
      id: string
      workspaceId: string
      phoneNumber?: string | null
      warmupStartedAt?: string | Date | null
      credentials?: Record<string, unknown>
    } | null
    if (!conn) return NextResponse.json({ status: 'unknown instance' })

    if (body.event === 'session.status') {
      await applySessionStatus(conn, body.payload as { status?: string })
      return NextResponse.json({ status: 'ok' })
    }

    if (body.event === 'message') {
      const incoming = extractMessage(body.payload as WahaMessagePayload)
      if (incoming) {
        try {
          await handleIncoming(conn.workspaceId, incoming)
        } catch (error: unknown) {
          console.error('[webhook:waha] message handling failed:', error)
        }
      }
      return NextResponse.json({ status: 'ok', received: incoming ? 1 : 0 })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (error: unknown) {
    console.error('[webhook:waha] failed:', error)
    // 200 so the gateway doesn't hammer retries — the error is logged.
    return NextResponse.json({ status: 'error' })
  }
}

async function applySessionStatus(
  conn: { id: string; phoneNumber?: string | null; warmupStartedAt?: string | Date | null; credentials?: Record<string, unknown> },
  payload: { status?: string } | undefined,
): Promise<void> {
  const status = payload?.status
  if (status === 'WORKING') {
    await updateChannelConnection(conn.id, {
      status: 'connected',
      ...(!conn.warmupStartedAt ? {
        warmupStartedAt: new Date(),
        sentDate: null,
        sentToday: 0,
        newContactDate: null,
        newContactsToday: 0,
        lastSentAt: null,
      } : {}),
      credentials: { ...(conn.credentials ?? {}), pairingQr: null, pairingCode: null },
    })
  } else if (status === 'STOPPED' || status === 'FAILED') {
    await updateChannelConnection(conn.id, { status: 'disconnected' })
  }
}

function extractMessage(payload: WahaMessagePayload | undefined): IncomingMessage | null {
  if (!payload) return null
  // Only direct chats — skip our own outbound messages and group chats.
  if (payload.fromMe) return null
  const jid = payload.from ?? ''
  if (!jid.endsWith('@c.us')) return null
  if (!payload.body) return null

  return {
    channel: 'whatsapp',
    external_contact_id: jid.split('@')[0],
    contact_name: payload.notifyName ?? payload._data?.notifyName ?? payload._data?.pushName ?? null,
    content: payload.body,
    raw: payload,
  }
}
