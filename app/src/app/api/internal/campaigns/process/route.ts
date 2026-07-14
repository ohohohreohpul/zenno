import { NextRequest, NextResponse } from 'next/server'
import { processCampaignQueue } from '@/lib/campaign-runner'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`)
}

async function handleProcess(req: NextRequest): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Campaign worker is not configured' }, { status: 503 })
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ data: await processCampaignQueue(1) })
  } catch (error: unknown) {
    console.error('[campaign-worker] processing failed:', error)
    return NextResponse.json({ error: 'Campaign processing failed' }, { status: 500 })
  }
}

export const GET = handleProcess
export const POST = handleProcess
