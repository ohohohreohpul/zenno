import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCampaign, getCampaigns } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

const lifecycleEnum = z.enum(['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'])
const audienceSchema = z.object({
  stages: z.array(lifecycleEnum).max(7).default([]),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  inactiveDays: z.number().int().min(1).max(3650).nullable().default(null),
  lostOnly: z.boolean().default(false),
  contactIds: z.array(z.string().min(1)).max(1000).default([]),
  resumeBot: z.boolean().default(true),
})

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
  campaignType: z.enum(['manual','triggered']).default('manual'),
  triggerStage: lifecycleEnum.optional(),
  audience: audienceSchema.optional(),
  followUpDelaysDays: z.array(z.number().int().min(1).max(90)).max(3).default([]),
  goal: z.string().max(4000).optional(),
  flow: z.array(flowNodeSchema).optional(),
}).refine(
  (d) => (d.goal && d.goal.trim().length > 0) || (d.flow && d.flow.length > 0),
  { message: 'Either goal or flow is required' },
).refine((d) => d.campaignType === 'manual' || Boolean(d.triggerStage), { message: 'Triggered campaigns require a stage', path: ['triggerStage'] })

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = requestWorkspaceId(req, req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1')

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

  const { name, campaignType, triggerStage, audience, followUpDelaysDays, goal, flow } = parsed.data
  const workspaceId = requestWorkspaceId(req, parsed.data.workspaceId)
  const goalText = goal ?? ''
  const flowArr = flow ?? []

  const campaign = await createCampaign({ workspaceId, name, campaignType, triggerStage: campaignType === 'triggered' ? triggerStage ?? null : null, audience: audience ?? {}, followUpDelaysDays, goal: goalText, flow: flowArr, status: 'draft' })
  return NextResponse.json({ data: campaign }, { status: 201 })
}
