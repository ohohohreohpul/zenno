import { getAiConfig, getAppointments, getContacts, getMessages } from './queries'
import { generateReplyCore, hasAiKey } from './ai'

/**
 * One-click optimization (DM Champ's flagship, tuned for sales).
 *
 * Analyzes recent conversations, splits them into "won" (led to a booking or
 * a won deal) and "lost" (stalled — the last message is outbound and no
 * reply came for 24h+), asks the LLM to find the pattern differences and
 * propose concrete edits to the system prompt, then returns the proposal
 * for the owner to approve in one click. We never auto-apply — the human
 * stays in charge.
 */

export interface ConversationSample {
  contactName: string
  stage: string
  outcome: 'won' | 'lost'
  transcript: string
}

export interface OptimizeProposal {
  summary: string
  wins: string[]
  losses: string[]
  proposedEdits: string
  currentPrompt: string
  proposedPrompt: string
}

const STALL_HOURS = 24
const MAX_TRANSCRIPT_CHARS = 1200
const MAX_SAMPLES_PER_OUTCOME = 6

export async function analyzeConversations(workspaceId: string): Promise<OptimizeProposal> {
  const { samples, currentPrompt } = await loadSamples(workspaceId)

  if (!hasAiKey() || samples.length === 0) {
    return {
      summary: samples.length === 0
        ? 'Not enough conversations yet to optimize. Once the agent has handled a few chats that either booked or stalled, come back here and the AI will propose prompt improvements.'
        : 'Analysis unavailable (no AI key). Connect an AI provider to run optimization.',
      wins: [],
      losses: [],
      proposedEdits: '',
      currentPrompt,
      proposedPrompt: currentPrompt,
    }
  }

  const won = samples.filter((s) => s.outcome === 'won').slice(0, MAX_SAMPLES_PER_OUTCOME)
  const lost = samples.filter((s) => s.outcome === 'lost').slice(0, MAX_SAMPLES_PER_OUTCOME)

  if (won.length === 0 && lost.length === 0) {
    return {
      summary: 'No conversations with a clear outcome yet. Optimization works best after at least a few bookings and a few stalled chats.',
      wins: [],
      losses: [],
      proposedEdits: '',
      currentPrompt,
      proposedPrompt: currentPrompt,
    }
  }

  const analysisPrompt = `You are a sales-performance analyst. Below are real customer conversations handled by an AI sales agent, labeled by outcome.

WON conversations (led to a booking or a closed deal):
${won.length > 0 ? won.map((s, i) => `\n--- Won ${i + 1} (${s.contactName}, stage: ${s.stage}) ---\n${s.transcript}`).join('\n') : '(none yet)'}

LOST / STALLED conversations (no reply for ${STALL_HOURS}h+, never booked):
${lost.length > 0 ? lost.map((s, i) => `\n--- Lost ${i + 1} (${s.contactName}, stage: ${s.stage}) ---\n${s.transcript}`).join('\n') : '(none yet)'}

CURRENT SYSTEM PROMPT:
${currentPrompt}

Analyze what the agent did well in the won conversations and where it lost the lost ones (objections it folded on, next steps it didn't propose, value it didn't build, pushiness, etc.). Then propose a revised system prompt that keeps what works and fixes what loses deals.

Respond as STRICT JSON (no markdown fences) with this shape:
{
  "summary": "2-3 sentence overall read on how the agent is performing",
  "wins": ["short bullet of a behavior that won deals", "..."],
  "losses": ["short bullet of a behavior that lost deals", "..."],
  "proposedEdits": "a short human-readable list of the concrete changes you're making to the prompt",
  "proposedPrompt": "the full revised system prompt, ready to paste"
}`

  try {
    const raw = await generateReplyCore(
      'You are a sales conversation analyst. You output only valid JSON.',
      [],
      analysisPrompt,
      2500,
    )
    const parsed = safeParseJson(raw)
    const str = (k: string): string | undefined => (typeof parsed[k] === 'string' ? (parsed[k] as string) : undefined)
    return {
      summary: str('summary') ?? 'Analysis complete.',
      wins: Array.isArray(parsed.wins) ? (parsed.wins as string[]) : [],
      losses: Array.isArray(parsed.losses) ? (parsed.losses as string[]) : [],
      proposedEdits: str('proposedEdits') ?? '',
      currentPrompt,
      proposedPrompt: str('proposedPrompt') ?? currentPrompt,
    }
  } catch {
    return {
      summary: 'Analysis failed. Please try again in a moment.',
      wins: [],
      losses: [],
      proposedEdits: '',
      currentPrompt,
      proposedPrompt: currentPrompt,
    }
  }
}

function safeParseJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const v: unknown = JSON.parse(cleaned)
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
  } catch {
    // Try to locate the first { ... } block.
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    return {}
  }
}

async function loadSamples(
  workspaceId: string,
): Promise<{ samples: ConversationSample[]; currentPrompt: string }> {
  const stallCutoff = new Date(Date.now() - STALL_HOURS * 60 * 60 * 1000)

  const [contacts, config, appointments] = await Promise.all([
    getContacts(workspaceId), getAiConfig(workspaceId), getAppointments(workspaceId),
  ]) as unknown as [
    Array<{ id: string; name?: string; lifecycleStage: string }>,
    { systemPrompt?: string },
    Array<{ contactId?: string }>,
  ]
  const currentPrompt = config.systemPrompt ?? ''
  const bookedContactIds = new Set(appointments.map((a) => a.contactId).filter(Boolean))

  const samples: ConversationSample[] = []
  for (const c of contacts) {
    const msgs = (await getMessages(c.id) as unknown as Array<{ direction: string; content: string; createdAt: string | Date }>).slice(0, 40)
    if (msgs.length < 2) continue
    const transcript = msgs
      .map((m) => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n')
      .slice(0, MAX_TRANSCRIPT_CHARS)
    const last = msgs[msgs.length - 1]
    const isWon = bookedContactIds.has(c.id) || ['trial_booked', 'attended', 'rebooked', 'vip'].includes(c.lifecycleStage)
    const isLost = !isWon && last.direction === 'outbound' && new Date(last.createdAt).getTime() < stallCutoff.getTime()
    if (isWon) samples.push({ contactName: c.name ?? 'Unknown', stage: c.lifecycleStage, outcome: 'won', transcript })
    else if (isLost) samples.push({ contactName: c.name ?? 'Unknown', stage: c.lifecycleStage, outcome: 'lost', transcript })
  }

  return { samples, currentPrompt }
}
