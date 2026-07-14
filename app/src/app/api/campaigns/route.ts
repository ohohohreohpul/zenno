import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCampaign, getCampaigns } from '@/lib/queries'

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

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  return NextResponse.json({ data: await getCampaigns(workspaceId) })
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

  const campaign = await createCampaign({ workspaceId, name, triggerStage: triggerStage ?? null, goal: goalText, flow: flowArr, status: 'draft' })
  return NextResponse.json({ data: campaign }, { status: 201 })
}
