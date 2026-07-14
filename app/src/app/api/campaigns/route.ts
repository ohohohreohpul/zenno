import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Campaign } from '@/models/Campaign'

const lifecycleEnum = z.enum(['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'])

const flowNodeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message'), content: z.string().min(1), channel: z.enum(['whatsapp','instagram','line','webchat','sms','email']).optional() }),
  z.object({ type: z.literal('wait'), delayMs: z.number().int().min(0) }),
  z.object({
    type: z.literal('branch'),
    condition: z.object({ field: z.literal('lifecycle_stage'), equals: lifecycleEnum }),
    trueIndex: z.number().int().min(0),
    falseIndex: z.number().int().min(0),
  }),
  z.object({ type: z.literal('exit') }),
])

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(120),
  triggerStage: lifecycleEnum.optional(),
  goal: z.string().max(4000).optional(),
  flow: z.array(flowNodeSchema).optional(),
}).refine(
  (d) => (d.goal && d.goal.trim().length > 0) || (d.flow && d.flow.length > 0),
  { message: 'Either goal or flow is required' },
)

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'

  if (IS_MOCK) {
    const data = MockDB.getCampaigns(workspaceId).map((c) => ({ ...c, id: c._id }))
    return NextResponse.json({ data })
  }

  await connectDb()
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const campaigns = await Campaign.find({ workspaceId }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({ data: campaigns.map((c) => ({ ...c, id: c._id.toString() })) })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { workspaceId, name, triggerStage, goal, flow } = parsed.data
  const goalText = goal ?? ''
  const flowArr = flow ?? []

  if (IS_MOCK) {
    const c = MockDB.createCampaign({ workspaceId, name, triggerStage: triggerStage ?? 'inquiry', goal: goalText, flow: flowArr, status: 'draft' })
    return NextResponse.json({ data: { ...c, id: c._id } }, { status: 201 })
  }

  await connectDb()
  const campaign = await Campaign.create({ workspaceId, name, triggerStage: triggerStage ?? null, goal: goalText, flow: flowArr, status: 'draft' })
  return NextResponse.json({ data: { ...campaign.toObject(), id: campaign._id.toString() } }, { status: 201 })
}
