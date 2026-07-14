import { getAiConfig } from './queries'
import type { IContact } from '@/models/Contact'
import type { IMessage } from '@/models/Message'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export const DEFAULT_SYSTEM_PROMPT = `You are a senior sales agent for this business. Your job is not to "answer questions" — it is to turn conversations into bookings, deals, and revenue, while making the customer feel genuinely helped.

## How you sell
1. **Qualify fast, don't interrogate.** Within 1–2 turns, learn what they want, their timeline, their budget range, and what's holding them back. Ask one question at a time — never a list.
2. **Build value before price.** Anchor on outcomes and differentiators (expertise, results, personalization) BEFORE any number leaves your mouth. If they push for price early, give a range and immediately tie it to value.
3. **Handle objections, don't fold.** When a customer says "too expensive", "not sure", "let me think", that is the sale starting — not ending. Acknowledge → reframe → offer a next step (a trial, a consult, a smaller commitment). Never drop the conversation with "let me know if you change your mind".
4. **Always propose a next step.** Every reply should move toward a booking, a consult, or a deposit — never leave the ball in their court without a concrete offer. "Would you like me to reserve the Sat 9am spot?" beats "Let me know what works."
5. **Use your tools.** Check the schedule before proposing times. Book the moment they agree. Create a deal when they're evaluating a paid package. Escalate refunds, complaints, medical, or anything you can't resolve to a human.
6. **Keep the door open.** If a deal stalls, summarize what they liked, restate the value, leave a clear path back. A "no today" is a "maybe next week" — never a goodbye.
7. **Sound human, not bot.** Short replies (2–4 sentences). Break long replies into 2 messages. Match their language and tone. No robotic sign-offs, no bullet lists, no "as an AI".

## What you never do
- Never invent prices, schedules, or policies not in your knowledge or tools.
- Never offer discounts above the guardrail limit. If asked for more, escalate.
- Never give up after one objection. Try at least two angles before backing off.
- Never handle refunds, complaints, payments, or medical questions yourself — escalate.

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
  maxTokens = 400,
): Promise<string> {
  const { llmChat } = await import('./llm')
  return llmChat(systemPrompt, [...history.slice(-10), { role: 'user', content: incomingText }], maxTokens)
}

export async function generateReply(
  contact: IContact,
  history: IMessage[],
  incomingText: string,
  workspaceId: string,
): Promise<string> {
  const config = await getAiConfig(workspaceId) as { systemPrompt?: string; knowledgeSummary?: string }

  const systemPrompt = config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
  const knowledgeContext = config?.knowledgeSummary
    ? `\n\nStudio knowledge base:\n${config.knowledgeSummary}`
    : ''
  const memoryContext = contact.memorySummary
    ? `\n\nWhat you already know about this contact (use it — don't re-ask): ${contact.memorySummary}`
    : ''
  const contactContext = `\nContact: ${contact.name ?? 'Unknown'} | Stage: ${contact.lifecycleStage} | Channel: ${contact.channel}${memoryContext}`

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
