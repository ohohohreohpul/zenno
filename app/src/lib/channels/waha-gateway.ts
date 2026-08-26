/**
 * Client for the self-hosted WAHA (WhatsApp HTTP API) session gateway —
 * replaces the Evolution API gateway. WAHA holds the WhatsApp session;
 * this app never talks to WhatsApp directly, it drives WAHA over REST and
 * receives inbound traffic via WAHA's webhook.
 *
 * Env:
 *   WAHA_GATEWAY_URL      e.g. https://waha.example.com
 *   WAHA_GATEWAY_API_KEY  the WAHA global API key (X-Api-Key)
 *   PUBLIC_APP_URL        base URL WAHA should deliver webhooks to
 *
 * Same public interface as the old wa-gateway.ts (isGatewayConfigured,
 * createInstance, fetchQr, fetchState, sendGatewayText, destroyInstance) so
 * callers don't need to change — only the import does.
 */

export type GatewayState = 'open' | 'connecting' | 'close' | 'unknown'

export interface QrResult {
  qrBase64: string | null
  pairingCode: string | null
}

export class GatewayRequestError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(`WAHA gateway ${method} ${path} failed: ${status}`)
  }
}

export function isGatewayConfigured(): boolean {
  return Boolean(process.env.WAHA_GATEWAY_URL && process.env.WAHA_GATEWAY_API_KEY)
}

function gatewayEnv(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.WAHA_GATEWAY_URL
  const apiKey = process.env.WAHA_GATEWAY_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('WAHA_GATEWAY_URL / WAHA_GATEWAY_API_KEY are not set')
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey }
}

async function gatewayFetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Record<string, unknown>> {
  const { baseUrl, apiKey } = gatewayEnv()
  const res = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new GatewayRequestError(init.method ?? 'GET', path, res.status, text.slice(0, 300))
  }
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function isExistingInstanceError(error: unknown): boolean {
  return error instanceof GatewayRequestError && (
    error.status === 409 || /already exists|session.*exist/i.test(error.responseBody)
  )
}

export interface GatewayReachability {
  url: string
  ok: boolean
  status?: number
  error?: string
}

export async function checkGatewayReachability(): Promise<GatewayReachability> {
  const url = process.env.WAHA_GATEWAY_URL?.trim() ?? ''
  const apiKey = process.env.WAHA_GATEWAY_API_KEY?.trim() ?? ''
  if (!url || !apiKey) {
    return { url, ok: false, error: 'WAHA_GATEWAY_URL or WAHA_GATEWAY_API_KEY not set' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/sessions`, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return { url, ok: true, status: res.status }
  } catch (error: unknown) {
    clearTimeout(timeout)
    return {
      url,
      ok: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown network error',
    }
  }
}

function webhookUrl(): string | null {
  const base =
    process.env.PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null)
  if (!base) return null
  const token = process.env.WAHA_WEBHOOK_TOKEN
  const path = `${base.replace(/\/$/, '')}/api/webhooks/waha`
  return token ? `${path}?token=${encodeURIComponent(token)}` : path
}

function extractQr(payload: Record<string, unknown>): QrResult {
  const base64 = typeof payload.data === 'string' ? payload.data : null
  return { qrBase64: base64 ? `data:image/png;base64,${base64}` : null, pairingCode: null }
}

/**
 * Create a WAHA session for a workspace and register our webhook.
 * WAHA sessions start in SCAN_QR_CODE state; fetch the QR separately.
 */
export async function createInstance(instanceName: string, phoneNumber?: string): Promise<QrResult> {
  const hook = webhookUrl()
  await gatewayFetch('/api/sessions', {
    method: 'POST',
    body: {
      name: instanceName,
      start: true,
      config: {
        ...(hook ? { webhooks: [{ url: hook, events: ['message', 'session.status'] }] } : {}),
      },
    },
  })
  return fetchQr(instanceName, phoneNumber)
}

/** Fetch a fresh QR (or pairing code) for an existing session — QRs expire quickly. */
export async function fetchQr(instanceName: string, phoneNumber?: string): Promise<QrResult> {
  if (phoneNumber) {
    const payload = await gatewayFetch(`/api/${encodeURIComponent(instanceName)}/auth/request-code`, {
      method: 'POST',
      body: { phoneNumber },
    })
    const pairingCode = typeof payload.code === 'string' ? payload.code : null
    return { qrBase64: null, pairingCode }
  }
  const payload = await gatewayFetch(`/api/${encodeURIComponent(instanceName)}/auth/qr`)
  return extractQr(payload)
}

export async function fetchState(instanceName: string): Promise<GatewayState> {
  const payload = await gatewayFetch(`/api/sessions/${encodeURIComponent(instanceName)}`)
  const status = payload.status
  if (status === 'WORKING') return 'open'
  if (status === 'STARTING' || status === 'SCAN_QR_CODE') return 'connecting'
  if (status === 'STOPPED' || status === 'FAILED') return 'close'
  return 'unknown'
}

/** Send a plain text message through a connected session. */
export async function sendGatewayText(
  instanceName: string,
  toNumber: string,
  text: string,
): Promise<void> {
  const number = toNumber.replace(/\D/g, '')
  if (!number) throw new Error(`Invalid recipient number: ${toNumber}`)
  await gatewayFetch('/api/sendText', {
    method: 'POST',
    body: { session: instanceName, chatId: `${number}@c.us`, text },
  })
}

/** Log the WhatsApp session out and remove it from the gateway. */
export async function destroyInstance(instanceName: string): Promise<void> {
  const name = encodeURIComponent(instanceName)
  try {
    await gatewayFetch(`/api/sessions/${name}/logout`, { method: 'POST' })
  } catch (error: unknown) {
    console.error('[waha-gateway] logout failed (continuing to delete):', error)
  }
  await gatewayFetch(`/api/sessions/${name}`, { method: 'DELETE' })
}
