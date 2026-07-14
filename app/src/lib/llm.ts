import Anthropic from '@anthropic-ai/sdk'
import type { ChatTurn } from './ai'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'z-ai/glm-4.5-air'
const ANTHROPIC_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 500
const MAX_TOOL_ROUNDS = 5

export interface LlmToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type ToolExecutor = (name: string, input: Record<string, unknown>) => Promise<object>

export function hasLlm(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY)
}

export function getLlmRuntime() {
  if (process.env.OPENROUTER_API_KEY) return { configured: true, provider: 'OpenRouter', model: OPENROUTER_MODEL }
  if (process.env.ANTHROPIC_API_KEY) return { configured: true, provider: 'Anthropic', model: ANTHROPIC_MODEL }
  return { configured: false, provider: null, model: null }
}

function usesOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

// ── OpenRouter (OpenAI-compatible) ────────────────────────────────────────────

interface OpenAiToolCall {
  id: string
  function: { name: string; arguments: string }
}

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenAiToolCall[]
  tool_call_id?: string
}

async function openRouterRequest(
  messages: OpenAiMessage[],
  tools: LlmToolDef[] | null,
  maxTokens: number,
): Promise<{ content: string | null; toolCalls: OpenAiToolCall[] }> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: maxTokens,
      messages,
      ...(tools && tools.length > 0
        ? { tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) }
        : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }[]
  }
  const message = data.choices?.[0]?.message
  if (!message) throw new Error('OpenRouter returned no choices')
  return { content: message.content ?? null, toolCalls: message.tool_calls ?? [] }
}

async function openRouterChat(system: string, turns: ChatTurn[], maxTokens: number): Promise<string> {
  const messages: OpenAiMessage[] = [
    { role: 'system', content: system },
    ...turns.map((t) => ({ role: t.role, content: t.content }) as OpenAiMessage),
  ]
  const { content } = await openRouterRequest(messages, null, maxTokens)
  if (!content) throw new Error('OpenRouter returned empty content')
  return content
}

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

async function openRouterChatWithTools(
  system: string,
  turns: ChatTurn[],
  tools: LlmToolDef[],
  execute: ToolExecutor,
  maxTokens: number,
): Promise<string> {
  const messages: OpenAiMessage[] = [
    { role: 'system', content: system },
    ...turns.map((t) => ({ role: t.role, content: t.content }) as OpenAiMessage),
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const { content, toolCalls } = await openRouterRequest(messages, tools, maxTokens)

    if (toolCalls.length === 0) {
      return content ?? ''
    }

    messages.push({ role: 'assistant', content: content ?? null, tool_calls: toolCalls })
    for (const call of toolCalls) {
      const result = await execute(call.function.name, parseToolArgs(call.function.arguments))
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
  }

  return 'Let me get back to you on that shortly.'
}

// ── Anthropic direct ──────────────────────────────────────────────────────────

function anthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

async function anthropicChat(system: string, turns: ChatTurn[], maxTokens: number): Promise<string> {
  const response = await anthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: turns,
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

async function anthropicChatWithTools(
  system: string,
  turns: ChatTurn[],
  tools: LlmToolDef[],
  execute: ToolExecutor,
  maxTokens: number,
): Promise<string> {
  const client = anthropicClient()
  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }))
  const messages: Anthropic.MessageParam[] = [...turns]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      tools: anthropicTools,
      messages,
    })

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (toolUses.length === 0 || response.stop_reason !== 'tool_use') {
      const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      return text?.text ?? ''
    }

    messages.push({ role: 'assistant', content: response.content })
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      const result = await execute(tu.name, tu.input as Record<string, unknown>)
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) })
    }
    messages.push({ role: 'user', content: results })
  }

  return 'Let me get back to you on that shortly.'
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function llmChat(
  system: string,
  turns: ChatTurn[],
  maxTokens = DEFAULT_MAX_TOKENS,
): Promise<string> {
  if (usesOpenRouter()) return openRouterChat(system, turns, maxTokens)
  return anthropicChat(system, turns, maxTokens)
}

export async function llmChatWithTools(
  system: string,
  turns: ChatTurn[],
  tools: LlmToolDef[],
  execute: ToolExecutor,
  maxTokens = DEFAULT_MAX_TOKENS,
): Promise<string> {
  if (usesOpenRouter()) return openRouterChatWithTools(system, turns, tools, execute, maxTokens)
  return anthropicChatWithTools(system, turns, tools, execute, maxTokens)
}
