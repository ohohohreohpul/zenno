import { connectDb } from './db'
import { WorkspaceAiConfig } from '@/models/WorkspaceAiConfig'
import type { IContact } from '@/models/Contact'
import type { IMessage } from '@/models/Message'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export const DEFAULT_SYSTEM_PROMPT = `You are a friendly AI assistant managing bookings and inquiries for a wellness studio.

Your goals:
1. Warmly greet new inquiries and understand what they're looking for
2. Qualify leads — ask about their experience level, what they want to achieve
3. Recommend the right class and offer a free trial booking
4. Confirm bookings clearly with date, time, instructor name, and location
5. Keep messages short — 2–4 sentences max per reply
6. Never be pushy. If someone isn't ready, offer to answer questions instead.

Always reply in the same language the contact is using.`

export function hasAiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY)
}

/**
 * Core reply generation — no DB access, usable from mock mode.
 * Routes through OpenRouter when OPENROUTER_API_KEY is set, else Anthropic direct.
 */
export async function generateReplyCore(
  systemPrompt: string,
  history: ChatTurn[],
  incomingText: string,
): Promise<string> {
  const { llmChat } = await import('./llm')
  return llmChat(systemPrompt, [...history.slice(-10), { role: 'user', content: incomingText }], 400)
}

export async function generateReply(
  contact: IContact,
  history: IMessage[],
  incomingText: string,
  workspaceId: string,
): Promise<string> {
  await connectDb()

  const config = await WorkspaceAiConfig.findOne({ workspaceId }).lean()

  const systemPrompt = config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
  const knowledgeContext = config?.knowledgeSummary
    ? `\n\nStudio knowledge base:\n${config.knowledgeSummary}`
    : ''
  const contactContext = `\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}`

  const conversationHistory: ChatTurn[] = history.slice(-10).map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }))

  return generateReplyCore(
    systemPrompt + knowledgeContext + contactContext,
    conversationHistory,
    incomingText,
  )
}
