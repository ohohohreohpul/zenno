import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnectionByInstance, updateChannelConnection } from '@/lib/queries'
import { handleIncoming } from '@/lib/conversation'
import type { IncomingMessage } from '@/types'

/**
 * Inbound webhook from the WhatsApp session gateway (Evolution API).
 * Receives MESSAGES_UPSERT (customer messages) and CONNECTION_UPDATE
 * (session opened/closed) events, maps the gateway instance back to its
 * workspace, and feeds messages into the shared conversation loop.
 *
 * When WA_GATEWAY_WEBHOOK_TOKEN is set, requests must carry it in the
 * x-zenno-webhook-token header. The query parameter remains accepted for
 * instances created before header authentication was introduced.
 */

interface GatewayMessageKey {
  remoteJid?: string
  fromMe?: boolean
  id?: string
}

interface GatewayMessageData {
  key?: GatewayMessageKey
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
    videoMessage?: { caption?: string }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expectedToken = process.env.WA_GATEWAY_WEBHOOK_TOKEN
  if (process.env.NODE_ENV === 'production' && !expectedToken) {
    return NextResponse.json({ error: 'Webhook token is not configured' }, { status: 503 })
  }
  const suppliedToken =
    req.headers.get('x-zenno-webhook-token') ??
    req.nextUrl.searchParams.get('token')
  if (expectedToken && suppliedToken !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = String(payload.event ?? '').toLowerCase().replace(/_/g, '.')
  const instanceName = typeof payload.instance === 'string' ? payload.instance : null
  if (!instanceName) return NextResponse.json({ status: 'ignored' })

  try {
    const conn = await getChannelConnectionByInstance(instanceName) as {
      id: string
      workspaceId: string
      warmupStartedAt?: string | Date | null
      credentials?: Record<string, unknown>
    } | null
    if (!conn) return NextResponse.json({ status: 'unknown instance' })

    if (event === 'connection.update') {
      await applyConnectionUpdate(conn, payload.data)
      return NextResponse.json({ status: 'ok' })
    }

    if (event === 'qrcode.updated') {
      await applyQrUpdate(conn.id, conn.credentials ?? {}, payload.data)
      return NextResponse.json({ status: 'ok' })
    }

    if (event === 'messages.upsert') {
      const incoming = extractMessages(payload.data)
      for (const msg of incoming) {
        try {
          await handleIncoming(conn.workspaceId, msg)
        } catch (error: unknown) {
          console.error('[webhook:wa-gateway] message handling failed:', error)
        }
      }
      return NextResponse.json({ status: 'ok', received: incoming.length })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (error: unknown) {
    console.error('[webhook:wa-gateway] failed:', error)
    // 200 so the gateway doesn't hammer retries — the error is logged.
    return NextResponse.json({ status: 'error' })
  }
}

async function applyConnectionUpdate(
  conn: { id: string; phoneNumber?: string | null; warmupStartedAt?: string | Date | null; credentials?: Record<string, unknown> },
  data: unknown,
): Promise<void> {
  const d = (data ?? {}) as Record<string, unknown>
  const state = d.state ?? d.connection
  if (state === 'open') {
    // wuid looks like "4917612345678@s.whatsapp.net"
    const wuid = typeof d.wuid === 'string' ? d.wuid : null
    const phone = wuid ? wuid.split('@')[0] : null
    const isNewNumber = Boolean(phone && phone !== conn.phoneNumber)
    await updateChannelConnection(conn.id, {
      status: 'connected',
      ...(phone ? { phoneNumber: phone } : {}),
      ...(!conn.warmupStartedAt || isNewNumber ? {
        warmupStartedAt: new Date(),
        sentDate: null,
        sentToday: 0,
        newContactDate: null,
        newContactsToday: 0,
        lastSentAt: null,
      } : {}),
      credentials: {
        ...(conn.credentials ?? {}),
        pairingQr: null,
        pairingCode: null,
      },
    })
  } else if (state === 'close') {
    await updateChannelConnection(conn.id, { status: 'disconnected' })
  }
}

async function applyQrUpdate(
  connId: string,
  credentials: Record<string, unknown>,
  data: unknown,
): Promise<void> {
  const root = (data ?? {}) as Record<string, unknown>
  const qr = (root.qrcode ?? root) as Record<string, unknown>
  await updateChannelConnection(connId, {
    status: 'pending_qr',
    credentials: {
      ...credentials,
      pairingQr: typeof qr.base64 === 'string' ? qr.base64 : null,
      pairingCode: typeof qr.pairingCode === 'string' ? qr.pairingCode : null,
    },
  })
}

function extractMessages(data: unknown): IncomingMessage[] {
  const items: GatewayMessageData[] = Array.isArray(data)
    ? (data as GatewayMessageData[])
    : data && typeof data === 'object'
      ? [data as GatewayMessageData]
      : []

  const results: IncomingMessage[] = []
  for (const item of items) {
    const key = item.key ?? {}
    const jid = key.remoteJid ?? ''
    // Only direct chats — skip our own messages, groups, and broadcasts.
    if (key.fromMe) continue
    if (!jid.endsWith('@s.whatsapp.net')) continue

    const text =
      item.message?.conversation ??
      item.message?.extendedTextMessage?.text ??
      item.message?.imageMessage?.caption ??
      item.message?.videoMessage?.caption ??
      null
    if (!text) continue

    results.push({
      channel: 'whatsapp',
      external_contact_id: jid.split('@')[0],
      contact_name: item.pushName ?? null,
      content: text,
      raw: item,
    })
  }
  return results
}
