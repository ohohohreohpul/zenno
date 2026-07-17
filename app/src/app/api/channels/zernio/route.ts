import { NextRequest, NextResponse } from 'next/server'
import { workspaceIdFrom } from '@/lib/channels/connection-helpers'
import { disconnectZernioAccount, isZernioConfigured, type ZernioChannel } from '@/lib/channels/zernio'
import { getChannelConnection, updateChannelConnection } from '@/lib/queries'

function channelParam(value: string | null): ZernioChannel | null {
  return value === 'messenger' || value === 'instagram' ? value : null
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const channel = channelParam(req.nextUrl.searchParams.get('channel'))
  if (!channel) return NextResponse.json({ error: 'channel must be messenger or instagram' }, { status: 400 })
  const connection = await getChannelConnection(workspaceIdFrom(req), channel) as {
    status?: string
    credentials?: { botUsername?: string; zernioAccountId?: string }
  } | null
  return NextResponse.json({
    data: {
      configured: isZernioConfigured(),
      status: connection?.status === 'connected' && connection.credentials?.zernioAccountId ? 'connected' : 'disconnected',
      account_name: connection?.credentials?.botUsername ?? null,
    },
  })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const channel = channelParam(req.nextUrl.searchParams.get('channel'))
  if (!channel) return NextResponse.json({ error: 'channel must be messenger or instagram' }, { status: 400 })
  const connection = await getChannelConnection(workspaceIdFrom(req), channel) as {
    id?: string
    credentials?: { zernioAccountId?: string }
  } | null
  try {
    if (connection?.credentials?.zernioAccountId) await disconnectZernioAccount(connection.credentials.zernioAccountId)
    if (connection?.id) {
      await updateChannelConnection(connection.id, {
        status: 'disconnected',
        credentials: { zernioAccountId: null, botUsername: null },
      })
    }
    return NextResponse.json({ data: { configured: isZernioConfigured(), status: 'disconnected', account_name: null } })
  } catch (error: unknown) {
    console.error('[zernio] disconnect failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not disconnect account' }, { status: 502 })
  }
}
