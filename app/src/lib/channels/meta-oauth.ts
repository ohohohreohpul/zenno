import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { upsertChannelConnection } from '@/lib/queries'
import { appBaseUrl, connectionInstanceName } from './connection-helpers'

/**
 * Facebook Login for Business — one-click channel connect for Messenger and
 * Instagram. The user authorizes our Meta app, we pull their Pages (with page
 * tokens) from the Graph API and auto-subscribe each connected page to our
 * webhooks. Requires META_APP_ID + META_APP_SECRET; the callback URL
 * `<app>/api/channels/meta/oauth/callback` must be a Valid OAuth Redirect URI
 * on the Meta app.
 */

const GRAPH_VERSION = 'v19.0'
const STATE_TTL_MS = 15 * 60 * 1000
const OAUTH_SCOPES = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'instagram_basic',
  'instagram_manage_messages',
].join(',')

export type MetaChannel = 'messenger' | 'instagram'

export interface MetaPage {
  id: string
  name: string
  accessToken: string
  instagramId: string | null
  instagramUsername: string | null
}

function graphBase(): string {
  return (process.env.GRAPH_API_BASE ?? `https://graph.facebook.com/${GRAPH_VERSION}`).replace(/\/$/, '')
}

export function isMetaOAuthConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && appBaseUrl())
}

function metaEnv(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) throw new Error('META_APP_ID / META_APP_SECRET are not set')
  return { appId, appSecret }
}

export function oauthRedirectUri(): string {
  const base = appBaseUrl()
  if (!base) throw new Error('PUBLIC_APP_URL is not set — required for the Meta OAuth callback')
  return `${base}/api/channels/meta/oauth/callback`
}

/* ---------- CSRF state (HMAC-signed, expiring) ---------- */

function stateSecret(): string {
  return process.env.AUTH_SECRET ?? 'dev-secret-change-me'
}

export function signOAuthState(workspaceId: string, channel: MetaChannel): string {
  const payload = Buffer.from(JSON.stringify({ ws: workspaceId, ch: channel, ts: Date.now() })).toString('base64url')
  const mac = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  return `${payload}.${mac}`
}

export function verifyOAuthState(state: string): { workspaceId: string; channel: MetaChannel } | null {
  const [payload, mac] = state.split('.')
  if (!payload || !mac) return null
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { ws?: string; ch?: string; ts?: number }
    if (!parsed.ws || (parsed.ch !== 'messenger' && parsed.ch !== 'instagram')) return null
    if (!parsed.ts || Date.now() - parsed.ts > STATE_TTL_MS) return null
    return { workspaceId: parsed.ws, channel: parsed.ch }
  } catch {
    return null
  }
}

/* ---------- OAuth dialog + token exchange ---------- */

export function buildAuthUrl(state: string): string {
  const { appId } = metaEnv()
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: oauthRedirectUri(),
    state,
    scope: OAUTH_SCOPES,
    response_type: 'code',
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`
}

async function graphGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${graphBase()}${path}?${new URLSearchParams(params)}`
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const err = body.error as { message?: string } | undefined
    throw new Error(`Meta API ${path} failed: ${err?.message ?? res.status}`)
  }
  return body
}

/** Exchange the callback code for a long-lived user access token. */
export async function exchangeCodeForLongLivedToken(code: string): Promise<string> {
  const { appId, appSecret } = metaEnv()
  const shortLived = await graphGet('/oauth/access_token', {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: oauthRedirectUri(),
    code,
  })
  const shortToken = typeof shortLived.access_token === 'string' ? shortLived.access_token : null
  if (!shortToken) throw new Error('Meta did not return an access token')

  const longLived = await graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  })
  return typeof longLived.access_token === 'string' ? longLived.access_token : shortToken
}

interface RawPage {
  id?: string
  name?: string
  access_token?: string
  instagram_business_account?: { id?: string; username?: string }
}

/** Pages the user admins, with page tokens and any linked IG professional account. */
export async function fetchPages(userToken: string): Promise<MetaPage[]> {
  const body = await graphGet('/me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    limit: '100',
    access_token: userToken,
  })
  const data = Array.isArray(body.data) ? (body.data as RawPage[]) : []
  return data
    .filter((p) => p.id && p.access_token)
    .map((p) => ({
      id: p.id as string,
      name: p.name ?? 'Facebook Page',
      accessToken: p.access_token as string,
      instagramId: p.instagram_business_account?.id ?? null,
      instagramUsername: p.instagram_business_account?.username ?? null,
    }))
}

/** Subscribe the page to our app's webhooks so inbound messages start flowing. */
async function subscribePage(pageId: string, pageToken: string): Promise<void> {
  const url = `${graphBase()}/${encodeURIComponent(pageId)}/subscribed_apps?${new URLSearchParams({
    subscribed_fields: 'messages',
    access_token: pageToken,
  })}`
  const res = await fetch(url, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } }
  if (!res.ok || !body.success) {
    throw new Error(`Webhook subscription failed: ${body.error?.message ?? res.status}`)
  }
}

/**
 * Store the chosen page as this workspace's connection for the channel and
 * subscribe it to our webhooks. Inbound signature verification uses our
 * platform app secret — events for OAuth-connected pages are signed by our
 * Meta app.
 */
export async function connectMetaPage(
  workspaceId: string,
  channel: MetaChannel,
  page: MetaPage,
): Promise<{ displayName: string; verifyToken: string | null }> {
  const { appSecret } = metaEnv()

  if (channel === 'instagram' && !page.instagramId) {
    throw new Error(`"${page.name}" has no Instagram Professional account linked. Link one in the Instagram app (Settings → Business tools) and reconnect.`)
  }

  await subscribePage(page.id, page.accessToken)

  const verifyToken = channel === 'instagram' ? randomBytes(24).toString('base64url') : null
  const displayName = channel === 'instagram' ? (page.instagramUsername ?? page.name) : page.name

  await upsertChannelConnection(workspaceId, channel, {
    status: 'connected',
    instanceName: connectionInstanceName(channel, workspaceId),
    credentials: {
      pageAccessToken: page.accessToken,
      pageId: page.id,
      appSecret,
      botUsername: displayName,
      ...(verifyToken ? { verifyToken } : {}),
      ...(page.instagramId ? { instagramId: page.instagramId } : {}),
      // Clear any pending OAuth token once the page is finalized.
      userAccessToken: null,
    },
  })

  return { displayName, verifyToken }
}

/** Park the long-lived user token so the UI can offer a page picker. */
export async function storePendingOAuth(workspaceId: string, channel: MetaChannel, userToken: string): Promise<void> {
  await upsertChannelConnection(workspaceId, channel, {
    status: 'disconnected',
    instanceName: connectionInstanceName(channel, workspaceId),
    credentials: { userAccessToken: userToken },
  })
}
