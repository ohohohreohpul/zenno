import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAiConfig, upsertAiConfig } from '@/lib/queries'
import { DEFAULT_GUARDRAILS } from '@/lib/guardrails'
import { getLlmRuntime } from '@/lib/llm'
import { requestWorkspaceId } from '@/lib/request-context'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = requestWorkspaceId(req, req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID)

  const config = await getAiConfig(workspaceId) as { systemPrompt?: string; knowledgeSummary?: string; guardrails?: unknown }
  return NextResponse.json({
    data: {
      workspaceId,
      systemPrompt: config?.systemPrompt ?? '',
      knowledgeSummary: config?.knowledgeSummary ?? '',
      guardrails: config?.guardrails ?? DEFAULT_GUARDRAILS,
      runtime: getLlmRuntime(),
      readiness: {
        hasPrompt: Boolean(config?.systemPrompt?.trim()),
        hasKnowledge: Boolean(config?.knowledgeSummary?.trim()),
      },
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
  knowledgeSummary: z.string().max(50000).optional(),
  guardrails: guardrailsSchema.optional(),
})

export async function PUT(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { systemPrompt, knowledgeSummary, guardrails } = parsed.data
  const workspaceId = requestWorkspaceId(req, parsed.data.workspaceId)
  if (!systemPrompt && knowledgeSummary === undefined && !guardrails) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 422 })
  }

  const update: Record<string, unknown> = {}
  if (systemPrompt) update.systemPrompt = systemPrompt
  if (knowledgeSummary !== undefined) update.knowledgeSummary = knowledgeSummary
  if (guardrails) update.guardrails = guardrails
  const config = await upsertAiConfig(workspaceId, update)
  return NextResponse.json({ data: config })
}
