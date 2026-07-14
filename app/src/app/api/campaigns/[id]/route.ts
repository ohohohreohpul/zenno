import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCampaign, updateCampaign } from '@/lib/queries'

const lifecycleEnum = z.enum(['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'])

const patchSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  triggerStage: lifecycleEnum.nullable().optional(),
  goal: z.string().max(4000).optional(),
  status: z.enum(['draft','active','paused','completed']).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const update: Record<string, unknown> = { ...parsed.data }
  if ('triggerStage' in update) update.triggerStage = parsed.data.triggerStage ?? null

  if (!await getCampaign(id)) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  const campaign = await updateCampaign(id, update)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json({ data: campaign })
}
