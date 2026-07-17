import { NextRequest, NextResponse } from 'next/server'
import { findZernioAccount, saveZernioConnection, verifyZernioState } from '@/lib/channels/zernio'

function settingsRedirect(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/dashboard/settings', req.url)
  url.searchParams.set('tab', 'channels')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams
  const state = verifyZernioState(query.get('state') ?? '')
  if (!state) return settingsRedirect(req, { zernio_error: 'Invalid or expired connection. Please try again.' })
  if (query.get('error')) {
    return settingsRedirect(req, { zernio_channel: state.channel, zernio_error: query.get('error_description') ?? query.get('error')! })
  }

  const accountId = query.get('accountId') ?? ''
  const profileId = query.get('profileId') ?? ''
  if (!accountId || profileId !== state.profileId) {
    return settingsRedirect(req, { zernio_channel: state.channel, zernio_error: 'The social account connection was not completed.' })
  }

  try {
    const account = await findZernioAccount(state.profileId, state.channel, accountId)
    await saveZernioConnection(state.workspaceId, state.channel, state.profileId, account)
    return settingsRedirect(req, {
      zernio_connected: state.channel,
      zernio_account: account.displayName ?? account.username ?? '',
    })
  } catch (error: unknown) {
    console.error('[zernio-oauth] callback failed:', error)
    return settingsRedirect(req, {
      zernio_channel: state.channel,
      zernio_error: error instanceof Error ? error.message : 'Social connection failed.',
    })
  }
}
