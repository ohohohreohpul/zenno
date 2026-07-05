import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateReplyCore, hasAiKey, type ChatTurn } from '@/lib/ai'
import { IS_MOCK, MockDB } from '@/lib/mock-store'

const requestSchema = z.object({
  workspaceId: z.string().min(1).default('ws-1'),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .max(30)
    .default([]),
  message: z.string().min(1).max(4000),
  systemPrompt: z.string().max(20000).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { workspaceId, history, message, systemPrompt } = parsed.data

  if (!hasAiKey()) {
    return NextResponse.json({
      data: {
        reply: 'The AI agent is not fully configured yet — add ANTHROPIC_API_KEY to .env.local to test intelligent replies.',
        aiGenerated: false,
      },
    })
  }

  const prompt = systemPrompt ?? (IS_MOCK ? MockDB.getSystemPrompt(workspaceId) : '')
  if (!prompt) return NextResponse.json({ error: 'No system prompt configured' }, { status: 422 })

  try {
    const reply = await generateReplyCore(prompt, history as ChatTurn[], message)
    return NextResponse.json({ data: { reply, aiGenerated: true } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'AI reply failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
