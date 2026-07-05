import type { IGuardrails } from '@/models/WorkspaceAiConfig'

export const DEFAULT_GUARDRAILS: IGuardrails = {
  alwaysEscalateTopics: [],
  maxDiscountPercent: null,
  businessHoursOnly: false,
}

/**
 * Renders workspace guardrails as hard rules appended to the agent's
 * system prompt at reply time.
 */
export function guardrailsToPrompt(guardrails: IGuardrails | undefined): string {
  const g = guardrails ?? DEFAULT_GUARDRAILS
  const rules: string[] = []

  if (g.alwaysEscalateTopics.length > 0) {
    rules.push(
      `If the customer mentions any of these topics, do not answer yourself — use flag_for_human and tell them a team member will follow up: ${g.alwaysEscalateTopics.join(', ')}.`,
    )
  }
  if (g.maxDiscountPercent !== null) {
    rules.push(
      `Never offer or agree to any discount above ${g.maxDiscountPercent}%. If asked for more, escalate with flag_for_human.`,
    )
  }
  rules.push('Never invent prices, schedules, or policies that are not in your instructions or tools.')

  return `\n\nHard rules (never break these):\n${rules.map((r) => `- ${r}`).join('\n')}`
}
