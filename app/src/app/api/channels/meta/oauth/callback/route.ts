import { NextRequest, NextResponse } from 'next/server'
import {
  connectMetaPage,
  exchangeCodeForLongLivedToken,
  fetchPages,
  storePendingOAuth,
  verifyOAuthState,
} from '@/lib/channels/meta-oauth'
import { workspaceIdFrom } from '@/lib/channels/connection-helpers'

/**
 * Meta OAuth redirect target. Exchanges the code, loads the user's Pages:
 * exactly one page connects immediately; several parks the token and sends
 * the user back to a page picker in Settings → Channels.
 */

function settingsRedirect(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/dashboard/settings', req.url)
  url.searchParams.set('tab', 'channels')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams

  if (query.get('error')) {
    return settingsRedirect(req, { meta_error: query.get('error_description') ?? 'Authorization was cancelled' })
  }

  const code = query.get('code') ?? ''
  const state = verifyOAuthState(query.get('state') ?? '')
  if (!code || !state) {
    return settingsRedirect(req, { meta_error: 'Invalid or expired authorization — try connecting again' })
  }
  // The session workspace must match the workspace that started the flow.
  if (state.workspaceId !== workspaceIdFrom(req)) {
    return settingsRedirect(req, { meta_error: 'This authorization belongs to a different workspace' })
  }

  try {
    const userToken = await exchangeCodeForLongLivedToken(code)
    const pages = await fetchPages(userToken)

    if (pages.length === 0) {
      return settingsRedirect(req, { meta_error: 'No Facebook Pages found on that account — the user must admin a Page' })
    }

    if (pages.length === 1) {
      const { displayName } = await connectMetaPage(state.workspaceId, state.channel, pages[0])
      return settingsRedirect(req, { meta_connected: state.channel, meta_page: displayName })
    }

    await storePendingOAuth(state.workspaceId, state.channel, userToken)
    return settingsRedirect(req, { meta_pick: state.channel })
  } catch (error: unknown) {
    console.error('[meta-oauth] callback failed:', error)
    return settingsRedirect(req, { meta_error: error instanceof Error ? error.message : 'Connection failed — try again' })
  }
}
