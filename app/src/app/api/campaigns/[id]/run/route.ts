import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { drainCampaignQueue, runCampaign } from '@/lib/campaign-runner'
import { getCampaign, getCampaignDeliveryStats } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params
  const campaign = await getCampaign(id) as { workspaceId?: string } | null
  if (!campaign || campaign.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  try {
    const result = await runCampaign(id)
    if (result.queued > 0) {
      // Deliver the first batch right away instead of waiting for the cron worker.
      after(async () => {
        try {
          await drainCampaignQueue()
        } catch (error: unknown) {
          console.error('[campaign-run] queue drain failed:', error)
        }
      })
    }
    return NextResponse.json({ data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Campaign run failed'
    const status = message === 'Campaign not found' ? 404 : 422
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params
  const campaign = await getCampaign(id) as { workspaceId?: string } | null
  if (!campaign || campaign.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json({ data: await getCampaignDeliveryStats(id) })
}
