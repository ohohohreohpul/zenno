/**
 * Client for the self-hosted WhatsApp session gateway (Evolution API v2).
 * The gateway holds Baileys sessions — users connect their own WhatsApp by
 * scanning a QR. This app never talks to WhatsApp directly; it drives the
 * gateway over REST and receives inbound traffic via the gateway's webhook.
 *
 * Env:
 *   WA_GATEWAY_URL      e.g. https://gateway.example.com
 *   WA_GATEWAY_API_KEY  the Evolution API global key
 *   PUBLIC_APP_URL      base URL the gateway should deliver webhooks to
 */

export type GatewayState = 'open' | 'connecting' | 'close' | 'unknown'

export interface QrResult {
  qrBase64: string | null
  pairingCode: string | null
}

export function isGatewayConfigured(): boolean {
  return Boolean(process.env.WA_GATEWAY_URL && process.env.WA_GATEWAY_API_KEY)
}

function gatewayEnv(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.WA_GATEWAY_URL
  const apiKey = process.env.WA_GATEWAY_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('WA_GATEWAY_URL / WA_GATEWAY_API_KEY are not set')
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
      apikey: apiKey,
      // Evolution applies its CORS allowlist even to server-to-server calls.
      Origin: process.env.PUBLIC_APP_URL ?? 'https://zen-agent.vercel.app',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Gateway ${init.method ?? 'GET'} ${path} failed: ${res.status} ${text.slice(0, 300)}`)
  }
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

function webhookUrl(): string | null {
  const base =
    process.env.PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null)
  if (!base) return null
  return `${base.replace(/\/$/, '')}/api/webhooks/wa-gateway`
}

function webhookHeaders(): Record<string, string> | undefined {
  const token = process.env.WA_GATEWAY_WEBHOOK_TOKEN
  return token ? { 'x-zenno-webhook-token': token } : undefined
}

function extractQr(payload: Record<string, unknown>): QrResult {
  const qr = (payload.qrcode ?? payload) as Record<string, unknown>
  const base64 = typeof qr.base64 === 'string' ? qr.base64 : null
  const pairingCode = typeof qr.pairingCode === 'string' ? qr.pairingCode : null
  return { qrBase64: base64, pairingCode }
}

/**
 * Create a gateway instance for a workspace and register our webhook.
 * Returns the initial QR when the gateway includes one.
 */
export async function createInstance(instanceName: string, phoneNumber?: string): Promise<QrResult> {
  const hook = webhookUrl()
  const payload = await gatewayFetch('/instance/create', {
    method: 'POST',
    body: {
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      ...(phoneNumber ? { number: phoneNumber } : {}),
      ...(hook
        ? {
            webhook: {
              url: hook,
              headers: webhookHeaders(),
              events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            },
          }
        : {}),
    },
  })
  return extractQr(payload)
}

/** Fetch a fresh QR for an existing instance (QRs expire quickly). */
export async function fetchQr(instanceName: string, phoneNumber?: string): Promise<QrResult> {
  const query = phoneNumber ? `?number=${encodeURIComponent(phoneNumber)}` : ''
  const payload = await gatewayFetch(`/instance/connect/${encodeURIComponent(instanceName)}${query}`)
  return extractQr(payload)
}

export async function fetchState(instanceName: string): Promise<GatewayState> {
  const payload = await gatewayFetch(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
  )
  const instance = payload.instance as Record<string, unknown> | undefined
  const state = instance?.state ?? payload.state
  if (state === 'open' || state === 'connecting' || state === 'close') return state
  return 'unknown'
}

/** Send a plain text message through a connected instance. */
export async function sendGatewayText(
  instanceName: string,
  toNumber: string,
  text: string,
): Promise<void> {
  // Evolution expects bare digits (country code, no +, no jid suffix).
  const number = toNumber.replace(/\D/g, '')
  if (!number) throw new Error(`Invalid recipient number: ${toNumber}`)
  await gatewayFetch(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: { number, text },
  })
}

/** Log the WhatsApp session out and remove the instance from the gateway. */
export async function destroyInstance(instanceName: string): Promise<void> {
  const name = encodeURIComponent(instanceName)
  try {
    await gatewayFetch(`/instance/logout/${name}`, { method: 'DELETE' })
  } catch (error: unknown) {
    // Already logged out is fine — deletion below is what matters.
    console.error('[wa-gateway] logout failed (continuing to delete):', error)
  }
  await gatewayFetch(`/instance/delete/${name}`, { method: 'DELETE' })
}
