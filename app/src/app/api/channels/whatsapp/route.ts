import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import {
  createInstance,
  destroyInstance,
  fetchQr,
  fetchState,
  isGatewayConfigured,
  type QrResult,
} from '@/lib/channels/wa-gateway'
import { currentDailyCap } from '@/lib/send-limits'
import {
  ChannelConnection,
  DEFAULT_SEND_LIMITS,
  type IChannelConnection,
} from '@/models/ChannelConnection'

/**
 * Workspace WhatsApp connection via the session gateway.
 *   GET    → connection status (+ fresh QR while pairing is pending)
 *   POST   → start connecting: create a gateway instance, return the QR
 *   PATCH  → update warm-up / rate-limit settings
 *   DELETE → log out and remove the instance
 */

const DEFAULT_WORKSPACE_ID = 'ws-1'

function workspaceIdFrom(req: NextRequest): string {
  return req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID
}

function instanceNameFor(workspaceId: string): string {
  return `zenno-${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

interface StatusPayload {
  gateway_configured: boolean
  status: string
  phone_number: string | null
  qr: string | null
  pairing_code: string | null
  limits: typeof DEFAULT_SEND_LIMITS
  cap_today: number | null
  sent_today: number
  warmup_started_at: Date | null
}

function toPayload(
  conn: IChannelConnection | null,
  qr: string | null = null,
  pairingCode: string | null = null,
): StatusPayload {
  return {
    gateway_configured: isGatewayConfigured(),
    status: conn?.status ?? 'disconnected',
    phone_number: conn?.phoneNumber ?? null,
    qr,
    pairing_code: pairingCode,
    limits: conn?.limits ?? DEFAULT_SEND_LIMITS,
    cap_today: conn ? currentDailyCap(conn.limits, conn.warmupStartedAt) : null,
    sent_today: conn?.sentToday ?? 0,
    warmup_started_at: conn?.warmupStartedAt ?? null,
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  if (!isGatewayConfigured()) {
    return NextResponse.json({ data: toPayload(null) })
  }

  try {
    await connectDb()
    const conn = await ChannelConnection.findOne({ workspaceId, channel: 'whatsapp' })
    if (!conn) return NextResponse.json({ data: toPayload(null) })

    // Reconcile our stored status with the gateway's live session state.
    let qr: string | null = null
    let pairingCode: string | null = null
    try {
      const state = await fetchState(conn.instanceName)
      if (state === 'open' && conn.status !== 'connected') {
        conn.status = 'connected'
        if (!conn.warmupStartedAt) conn.warmupStartedAt = new Date()
        await conn.save()
      } else if (state === 'close' && conn.status === 'connected') {
        conn.status = 'disconnected'
        await conn.save()
      }
      if (conn.status === 'pending_qr') {
        const fresh = await fetchQr(conn.instanceName)
        qr = fresh.qrBase64
        pairingCode = fresh.pairingCode
      }
    } catch (error: unknown) {
      console.error('[channels:whatsapp] gateway state check failed:', error)
    }

    return NextResponse.json({ data: toPayload(conn, qr, pairingCode) })
  } catch (error: unknown) {
    console.error('[channels:whatsapp] status failed:', error)
    return NextResponse.json({ error: 'Could not load channel status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  if (!isGatewayConfigured()) {
    return NextResponse.json(
      { error: 'The WhatsApp gateway is not configured (WA_GATEWAY_URL / WA_GATEWAY_API_KEY)' },
      { status: 503 },
    )
  }

  try {
    await connectDb()
    const instanceName = instanceNameFor(workspaceId)

    let conn = await ChannelConnection.findOne({ workspaceId, channel: 'whatsapp' })
    if (conn?.status === 'connected') {
      return NextResponse.json({ data: toPayload(conn) })
    }

    let qr: QrResult
    try {
      qr = await createInstance(instanceName)
    } catch (error: unknown) {
      // Instance may already exist from a previous attempt — ask it for a QR.
      console.error('[channels:whatsapp] create failed, trying reconnect:', error)
      qr = await fetchQr(instanceName)
    }

    conn = await ChannelConnection.findOneAndUpdate(
      { workspaceId, channel: 'whatsapp' },
      {
        $set: { instanceName, status: 'pending_qr' },
        $setOnInsert: { limits: DEFAULT_SEND_LIMITS },
      },
      { upsert: true, new: true },
    )

    return NextResponse.json({ data: toPayload(conn, qr.qrBase64, qr.pairingCode) })
  } catch (error: unknown) {
    console.error('[channels:whatsapp] connect failed:', error)
    return NextResponse.json(
      { error: 'Could not start the WhatsApp connection — check the gateway' },
      { status: 502 },
    )
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let body: { daily_cap_base?: unknown; daily_cap_max?: unknown; min_delay_seconds?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, number> = {}
  const fields: Array<[keyof typeof body, string, number, number]> = [
    ['daily_cap_base', 'limits.dailyCapBase', 1, 1000],
    ['daily_cap_max', 'limits.dailyCapMax', 1, 5000],
    ['min_delay_seconds', 'limits.minDelaySeconds', 0, 3600],
  ]
  for (const [key, path, min, max] of fields) {
    const value = body[key]
    if (value === undefined) continue
    const n = Number(value)
    if (!Number.isFinite(n) || n < min || n > max) {
      return NextResponse.json({ error: `${key} must be between ${min} and ${max}` }, { status: 400 })
    }
    updates[path] = Math.round(n)
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 })
  }

  try {
    await connectDb()
    const conn = await ChannelConnection.findOneAndUpdate(
      { workspaceId, channel: 'whatsapp' },
      { $set: updates },
      { new: true },
    )
    if (!conn) return NextResponse.json({ error: 'No WhatsApp connection yet' }, { status: 404 })
    return NextResponse.json({ data: toPayload(conn) })
  } catch (error: unknown) {
    console.error('[channels:whatsapp] settings update failed:', error)
    return NextResponse.json({ error: 'Could not save settings' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  try {
    await connectDb()
    const conn = await ChannelConnection.findOne({ workspaceId, channel: 'whatsapp' })
    if (!conn) return NextResponse.json({ data: toPayload(null) })

    if (isGatewayConfigured()) {
      try {
        await destroyInstance(conn.instanceName)
      } catch (error: unknown) {
        console.error('[channels:whatsapp] gateway teardown failed:', error)
      }
    }

    conn.status = 'disconnected'
    conn.phoneNumber = null
    await conn.save()
    return NextResponse.json({ data: toPayload(conn) })
  } catch (error: unknown) {
    console.error('[channels:whatsapp] disconnect failed:', error)
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
