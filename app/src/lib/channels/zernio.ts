import { createHmac, timingSafeEqual } from 'crypto'
import { getChannelConnection, upsertChannelConnection } from '@/lib/queries'
import { appBaseUrl, connectionInstanceName } from './connection-helpers'

const API_BASE = (process.env.ZERNIO_API_BASE ?? 'https://zernio.com/api/v1').replace(/\/$/, '')
const STATE_TTL_MS = 20 * 60 * 1000

export type ZernioChannel = 'messenger' | 'instagram'
export type ZernioPlatform = 'facebook' | 'instagram'

interface ZernioProfile {
  _id: string
  name: string
}

export interface ZernioAccount {
  _id: string
  platform: string
  profileId: string | { _id?: string; name?: string }
  username?: string
  displayName?: string
  isActive?: boolean
}

function apiKey(): string {
  const key = process.env.ZERNIO_API_KEY
  if (!key) throw new Error('ZERNIO_API_KEY is not configured')
  return key
}

function stateSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not configured')
  return secret
}

async function zernioRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Zernio request failed (${response.status})`)
  }
  return body as T
}

export function isZernioConfigured(): boolean {
  return Boolean(process.env.ZERNIO_API_KEY && process.env.AUTH_SECRET && appBaseUrl())
}

export function channelPlatform(channel: ZernioChannel): ZernioPlatform {
  return channel === 'messenger' ? 'facebook' : 'instagram'
}

function profileIdOf(account: ZernioAccount): string {
  return typeof account.profileId === 'string' ? account.profileId : (account.profileId._id ?? '')
}

export async function ensureZernioProfile(workspaceId: string): Promise<string> {
  for (const channel of ['messenger', 'instagram'] as const) {
    const connection = await getChannelConnection(workspaceId, channel) as {
      credentials?: { zernioProfileId?: string }
    } | null
    if (connection?.credentials?.zernioProfileId) return connection.credentials.zernioProfileId
  }

  const name = `Zenno ${workspaceId}`
  const listed = await zernioRequest<{ profiles?: ZernioProfile[] }>('/profiles?includeOverLimit=true')
  const existing = (listed.profiles ?? []).find((profile) => profile.name === name)
  if (existing?._id) return existing._id

  const created = await zernioRequest<{ profile?: ZernioProfile }>('/profiles', {
    method: 'POST',
    body: JSON.stringify({ name, description: `Zenno workspace ${workspaceId}` }),
  })
  if (!created.profile?._id) throw new Error('Zernio did not return a profile ID')
  return created.profile._id
}

export function signZernioState(workspaceId: string, channel: ZernioChannel, profileId: string): string {
  const payload = Buffer.from(JSON.stringify({ ws: workspaceId, ch: channel, profileId, ts: Date.now() })).toString('base64url')
  const signature = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyZernioState(state: string): { workspaceId: string; channel: ZernioChannel; profileId: string } | null {
  const [payload, signature] = state.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { ws?: string; ch?: string; profileId?: string; ts?: number }
    if (!parsed.ws || !parsed.profileId || (parsed.ch !== 'messenger' && parsed.ch !== 'instagram')) return null
    if (!parsed.ts || Date.now() - parsed.ts > STATE_TTL_MS) return null
    return { workspaceId: parsed.ws, channel: parsed.ch, profileId: parsed.profileId }
  } catch {
    return null
  }
}

export function zernioCallbackUrl(state: string): string {
  const base = appBaseUrl()
  if (!base) throw new Error('PUBLIC_APP_URL is not configured')
  const url = new URL('/api/channels/zernio/oauth/callback', base)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function createZernioConnectUrl(
  channel: ZernioChannel,
  profileId: string,
  redirectUrl: string,
): Promise<string> {
  const params = new URLSearchParams({ profileId, redirect_url: redirectUrl })
  const result = await zernioRequest<{ authUrl?: string }>(`/connect/${channelPlatform(channel)}?${params}`)
  if (!result.authUrl) throw new Error('Zernio did not return an authorization URL')
  return result.authUrl
}

export async function findZernioAccount(profileId: string, channel: ZernioChannel, accountId: string): Promise<ZernioAccount> {
  const params = new URLSearchParams({ profileId, platform: channelPlatform(channel), includeOverLimit: 'true' })
  const result = await zernioRequest<{ accounts?: ZernioAccount[] }>(`/accounts?${params}`)
  const account = (result.accounts ?? []).find((candidate) => candidate._id === accountId && profileIdOf(candidate) === profileId)
  if (!account) throw new Error('The connected social account could not be verified')
  return account
}

export async function saveZernioConnection(
  workspaceId: string,
  channel: ZernioChannel,
  profileId: string,
  account: ZernioAccount,
): Promise<void> {
  await upsertChannelConnection(workspaceId, channel, {
    status: 'connected',
    instanceName: connectionInstanceName(channel, workspaceId),
    credentials: {
      zernioProfileId: profileId,
      zernioAccountId: account._id,
      botUsername: account.displayName ?? account.username ?? channelPlatform(channel),
      pageAccessToken: null,
      appSecret: null,
      userAccessToken: null,
    },
  })
}

export async function disconnectZernioAccount(accountId: string): Promise<void> {
  await zernioRequest(`/accounts/${encodeURIComponent(accountId)}`, { method: 'DELETE' })
}

export function makeZernioRecipient(accountId: string, conversationId: string): string {
  return `zernio:${encodeURIComponent(accountId)}:${encodeURIComponent(conversationId)}`
}

export function parseZernioRecipient(value: string): { accountId: string; conversationId: string } | null {
  const match = /^zernio:([^:]+):(.+)$/.exec(value)
  if (!match) return null
  try {
    return { accountId: decodeURIComponent(match[1]), conversationId: decodeURIComponent(match[2]) }
  } catch {
    return null
  }
}

export async function sendZernioMessage(accountId: string, conversationId: string, message: string): Promise<void> {
  await zernioRequest(`/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ accountId, message }),
  })
}

export function verifyZernioWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
