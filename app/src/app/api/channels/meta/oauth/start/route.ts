import { NextRequest, NextResponse } from 'next/server'
import { buildAuthUrl, isMetaOAuthConfigured, signOAuthState, type MetaChannel } from '@/lib/channels/meta-oauth'
import { workspaceIdFrom } from '@/lib/channels/connection-helpers'

/** Kicks off Facebook Login for Business for the requested channel. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const channel = req.nextUrl.searchParams.get('channel')
  if (channel !== 'messenger' && channel !== 'instagram') {
    return NextResponse.json({ error: 'channel must be messenger or instagram' }, { status: 400 })
  }
  if (!isMetaOAuthConfigured()) {
    return NextResponse.json({ error: 'Meta OAuth is not configured (META_APP_ID / META_APP_SECRET)' }, { status: 400 })
  }
  try {
    const state = signOAuthState(workspaceIdFrom(req), channel as MetaChannel)
    return NextResponse.redirect(buildAuthUrl(state))
  } catch (error: unknown) {
    console.error('[meta-oauth] start failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not start Meta OAuth' }, { status: 500 })
  }
}
