import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidObjectId } from 'mongoose'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Campaign } from '@/models/Campaign'

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

  if (IS_MOCK) {
    const existing = MockDB.getCampaign(id)
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    const updated = MockDB.updateCampaign(id, update as Parameters<typeof MockDB.updateCampaign>[1])
    return NextResponse.json({ data: { ...updated, id } })
  }

  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  await connectDb()
  const campaign = await Campaign.findByIdAndUpdate(id, { $set: update }, { new: true }).lean()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json({ data: { ...campaign, id: campaign._id.toString() } })
}
