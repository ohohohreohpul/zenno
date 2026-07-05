import { NextRequest, NextResponse } from 'next/server'
import { runCampaign } from '@/lib/campaign-runner'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  try {
    const result = await runCampaign(id)
    return NextResponse.json({ data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Campaign run failed'
    const status = message === 'Campaign not found' ? 404 : 422
    return NextResponse.json({ error: message }, { status })
  }
}
