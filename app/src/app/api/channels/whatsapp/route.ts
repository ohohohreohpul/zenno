import { NextRequest, NextResponse } from 'next/server'
import { getChannelConnection, updateChannelConnection, upsertChannelConnection } from '@/lib/queries'
import {
  createInstance,
  destroyInstance,
  fetchQr,
  fetchState,
  GatewayRequestError,
  isGatewayConfigured,
  isExistingInstanceError,
  type QrResult,
} from '@/lib/channels/wa-gateway'
import { capsForWarmupDay, currentWarmupDay, normalizeSendLimits } from '@/lib/send-limits'
import { DEFAULT_SEND_LIMITS, type IChannelConnection } from '@/models/ChannelConnection'

/**
 * Workspace WhatsApp connection via the session gateway.
 *   GET    → connection status (+ fresh QR while pairing is pending)
 *   POST   → start connecting: create a gateway instance, return the QR
 *   PATCH  → update warm-up / rate-limit settings
 *   DELETE → log out and remove the instance
 */

const DEFAULT_WORKSPACE_ID = 'ws-1'

function workspaceIdFrom(req: NextRequest): string {
  return req.headers.get('x-zenno-workspace-id') ?? req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID
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
  new_contact_cap_today: number | null
  new_contacts_today: number
  warmup_day: number
  ramp_days: number
  tomorrow_cap: number | null
  tomorrow_new_contact_cap: number | null
  warmup_started_at: Date | null
}

function toPayload(
  conn: IChannelConnection | null,
  qr: string | null = conn?.credentials?.pairingQr ?? null,
  pairingCode: string | null = conn?.credentials?.pairingCode ?? null,
): StatusPayload {
  const limits = normalizeSendLimits(conn?.limits)
  const warmupDay = currentWarmupDay(conn?.warmupStartedAt ?? null)
  const todayCaps = capsForWarmupDay(limits, warmupDay)
  const tomorrowCaps = capsForWarmupDay(limits, warmupDay + 1)
  return {
    gateway_configured: isGatewayConfigured(),
    status: conn?.status ?? 'disconnected',
    phone_number: conn?.phoneNumber ?? null,
    qr,
    pairing_code: pairingCode,
    limits,
    cap_today: conn ? todayCaps.total : null,
    sent_today: conn?.sentToday ?? 0,
    new_contact_cap_today: conn ? todayCaps.newContacts : null,
    new_contacts_today: conn?.newContactsToday ?? 0,
    warmup_day: warmupDay,
    ramp_days: limits.rampDays,
    tomorrow_cap: conn ? tomorrowCaps.total : null,
    tomorrow_new_contact_cap: conn ? tomorrowCaps.newContacts : null,
    warmup_started_at: conn?.warmupStartedAt ?? null,
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)
  if (!isGatewayConfigured()) {
    return NextResponse.json({ data: toPayload(null) })
  }

  try {
    const conn = await getChannelConnection(workspaceId, 'whatsapp') as unknown as IChannelConnection | null
    if (!conn) return NextResponse.json({ data: toPayload(null) })

    // Reconcile our stored status with the gateway's live session state. QR
    // refreshes arrive through QRCODE_UPDATED webhooks; polling this endpoint
    // must not repeatedly restart the underlying WhatsApp socket.
    try {
      const state = await fetchState(conn.instanceName)
      if (state === 'open' && conn.status !== 'connected') {
        conn.status = 'connected'
        if (!conn.warmupStartedAt) conn.warmupStartedAt = new Date()
        await updateChannelConnection(conn.id, { status: conn.status, warmupStartedAt: conn.warmupStartedAt })
      } else if (state === 'close' && conn.status === 'connected') {
        conn.status = 'disconnected'
        await updateChannelConnection(conn.id, { status: conn.status })
      }
    } catch (error: unknown) {
      console.error('[channels:whatsapp] gateway state check failed:', error)
    }

    return NextResponse.json({ data: toPayload(conn) })
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
    let phoneNumber: string | undefined
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = (await req.json()) as { phone_number?: unknown }
      if (body.phone_number !== undefined && body.phone_number !== '') {
        const digits = String(body.phone_number).replace(/\D/g, '')
        if (!/^\d{8,15}$/.test(digits)) {
          return NextResponse.json(
            { error: 'Enter a valid international WhatsApp number including country code' },
            { status: 400 },
          )
        }
        phoneNumber = digits
      }
    }

    const instanceName = instanceNameFor(workspaceId)

    let conn = await getChannelConnection(workspaceId, 'whatsapp') as unknown as IChannelConnection | null
    if (conn?.status === 'connected') {
      return NextResponse.json({ data: toPayload(conn) })
    }

    let qr: QrResult
    try {
      qr = await createInstance(instanceName, phoneNumber)
    } catch (error: unknown) {
      // Instance may already exist from a previous attempt — ask it for a QR.
      if (!isExistingInstanceError(error)) throw error
      console.error('[channels:whatsapp] instance already exists, fetching a fresh QR:', error)
      qr = await fetchQr(instanceName, phoneNumber)
    }

    conn = await upsertChannelConnection(workspaceId, 'whatsapp', {
      instanceName,
      status: 'pending_qr',
      limits: normalizeSendLimits(conn?.limits),
      credentials: {
        ...(conn?.credentials ?? {}),
        pairingQr: qr.qrBase64,
        pairingCode: qr.pairingCode,
        pairingPhoneNumber: phoneNumber ?? null,
      },
    }) as unknown as IChannelConnection

    return NextResponse.json({ data: toPayload(conn, qr.qrBase64, qr.pairingCode) })
  } catch (error: unknown) {
    console.error('[channels:whatsapp] connect failed:', error)
    return NextResponse.json(
      { error: gatewayConnectError(error) },
      { status: 502 },
    )
  }
}

function gatewayConnectError(error: unknown): string {
  if (!(error instanceof GatewayRequestError)) {
    return 'Could not reach the WhatsApp gateway. Check WA_GATEWAY_URL and that the gateway is online.'
  }

  if (error.status === 401 || error.status === 403) {
    return 'The WhatsApp gateway rejected its API key. Check WA_GATEWAY_API_KEY.'
  }
  if (error.status === 404) {
    return 'The WhatsApp gateway endpoint was not found. Check WA_GATEWAY_URL and gateway version.'
  }
  if (error.status >= 500) {
    return 'The WhatsApp gateway is unavailable. Check its logs and restart it if needed.'
  }
  return `The WhatsApp gateway rejected the connection request (HTTP ${error.status}). Check its logs.`
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const workspaceId = workspaceIdFrom(req)

  let body: {
    daily_cap_base?: unknown; daily_cap_max?: unknown
    new_contact_cap_base?: unknown; new_contact_cap_max?: unknown
    ramp_days?: unknown; min_delay_seconds?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Partial<typeof DEFAULT_SEND_LIMITS> = {}
  const fields: Array<[keyof typeof body, string, number, number]> = [
    ['daily_cap_base', 'dailyCapBase', 1, 1000],
    ['daily_cap_max', 'dailyCapMax', 1, 5000],
    ['new_contact_cap_base', 'newContactCapBase', 0, 1000],
    ['new_contact_cap_max', 'newContactCapMax', 0, 5000],
    ['ramp_days', 'rampDays', 1, 365],
    ['min_delay_seconds', 'minDelaySeconds', 0, 3600],
  ]
  for (const [key, path, min, max] of fields) {
    const value = body[key]
    if (value === undefined) continue
    const n = Number(value)
    if (!Number.isFinite(n) || n < min || n > max) {
      return NextResponse.json({ error: `${key} must be between ${min} and ${max}` }, { status: 400 })
    }
    updates[path as keyof typeof DEFAULT_SEND_LIMITS] = Math.round(n)
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 })
  }

  try {
    const existing = await getChannelConnection(workspaceId, 'whatsapp') as unknown as IChannelConnection | null
    const conn = existing ? await updateChannelConnection(existing.id, { limits: { ...normalizeSendLimits(existing.limits), ...updates } }) as unknown as IChannelConnection : null
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
    const conn = await getChannelConnection(workspaceId, 'whatsapp') as unknown as IChannelConnection | null
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
    await updateChannelConnection(conn.id, {
      status: 'disconnected',
      phoneNumber: null,
      credentials: {
        ...(conn.credentials ?? {}),
        pairingQr: null,
        pairingCode: null,
        pairingPhoneNumber: null,
      },
    })
    return NextResponse.json({ data: toPayload(conn) })
  } catch (error: unknown) {
    console.error('[channels:whatsapp] disconnect failed:', error)
    return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 })
  }
}
