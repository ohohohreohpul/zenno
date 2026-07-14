import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCampaign, updateCampaign } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

const lifecycleEnum = z.enum(['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'])
const audienceSchema = z.object({
  stages: z.array(lifecycleEnum).max(7), tags: z.array(z.string().min(1).max(40)).max(20),
  inactiveDays: z.number().int().min(1).max(3650).nullable(), lostOnly: z.boolean(),
  contactIds: z.array(z.string().min(1)).max(1000), resumeBot: z.boolean(),
})
const flowNodeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message'), content: z.string().min(1), channel: z.enum(['whatsapp','instagram','line','webchat','sms','email']).optional() }),
  z.object({ type: z.literal('wait'), delayMs: z.number().int().min(0) }),
  z.object({ type: z.literal('exit') }),
])

const patchSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  campaignType: z.enum(['manual','triggered']).optional(),
  triggerStage: lifecycleEnum.nullable().optional(),
  audience: audienceSchema.optional(),
  followUpDelaysDays: z.array(z.number().int().min(1).max(90)).max(3).optional(),
  goal: z.string().max(4000).optional(),
  flow: z.array(flowNodeSchema).optional(),
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
  delete update.workspaceId
  if ('triggerStage' in update) update.triggerStage = parsed.data.triggerStage ?? null

  const existing = await getCampaign(id) as { workspaceId?: string } | null
  if (!existing || existing.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  const campaign = await updateCampaign(id, update)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json({ data: campaign })
}
