import { NextRequest, NextResponse } from 'next/server'
import { workspaceIdFrom, connectionInstanceName } from '@/lib/channels/connection-helpers'
import {
  createZernioConnectUrl,
  ensureZernioProfile,
  isZernioConfigured,
  signZernioState,
  zernioCallbackUrl,
  type ZernioChannel,
} from '@/lib/channels/zernio'
import { upsertChannelConnection } from '@/lib/queries'

function channelParam(value: string | null): ZernioChannel | null {
  return value === 'messenger' || value === 'instagram' ? value : null
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const channel = channelParam(req.nextUrl.searchParams.get('channel'))
  if (!channel) return NextResponse.json({ error: 'channel must be messenger or instagram' }, { status: 400 })
  if (!isZernioConfigured()) return NextResponse.json({ error: 'Social OAuth is not configured' }, { status: 503 })

  const workspaceId = workspaceIdFrom(req)
  try {
    const profileId = await ensureZernioProfile(workspaceId)
    await upsertChannelConnection(workspaceId, channel, {
      status: 'disconnected',
      instanceName: connectionInstanceName(channel, workspaceId),
      credentials: { zernioProfileId: profileId },
    })
    const state = signZernioState(workspaceId, channel, profileId)
    const authUrl = await createZernioConnectUrl(channel, profileId, zernioCallbackUrl(state))
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    console.error('[zernio-oauth] start failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not start social connection' }, { status: 502 })
  }
}
