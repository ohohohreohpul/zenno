import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { WorkspaceAiConfig } from '@/models/WorkspaceAiConfig'
import { DEFAULT_GUARDRAILS } from '@/lib/guardrails'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID

  if (IS_MOCK) {
    return NextResponse.json({
      data: {
        workspaceId,
        systemPrompt: MockDB.getSystemPrompt(workspaceId),
        guardrails: MockDB.getGuardrails(workspaceId),
      },
    })
  }

  await connectDb()
  const config = await WorkspaceAiConfig.findOne({ workspaceId }).lean()
  return NextResponse.json({
    data: {
      workspaceId,
      systemPrompt: config?.systemPrompt ?? '',
      guardrails: config?.guardrails ?? DEFAULT_GUARDRAILS,
    },
  })
}

const guardrailsSchema = z.object({
  alwaysEscalateTopics: z.array(z.string().min(1).max(80)).max(30),
  maxDiscountPercent: z.number().min(0).max(100).nullable(),
  businessHoursOnly: z.boolean(),
})

const updateSchema = z.object({
  workspaceId: z.string().min(1).default(DEFAULT_WORKSPACE_ID),
  systemPrompt: z.string().min(1).max(20000).optional(),
  guardrails: guardrailsSchema.optional(),
})

export async function PUT(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { workspaceId, systemPrompt, guardrails } = parsed.data
  if (!systemPrompt && !guardrails) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 422 })
  }

  if (IS_MOCK) {
    if (systemPrompt) MockDB.setSystemPrompt(workspaceId, systemPrompt)
    if (guardrails) MockDB.setGuardrails(workspaceId, guardrails)
    return NextResponse.json({ data: { workspaceId, systemPrompt, guardrails } })
  }

  await connectDb()
  const update: Record<string, unknown> = {}
  if (systemPrompt) update.systemPrompt = systemPrompt
  if (guardrails) update.guardrails = guardrails
  await WorkspaceAiConfig.findOneAndUpdate({ workspaceId }, { $set: update }, { upsert: true })
  return NextResponse.json({ data: { workspaceId, systemPrompt, guardrails } })
}
