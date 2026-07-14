import { addCredits as addCreditsQuery, getAgencyBalance, spendCredits } from './queries'

export const CREDIT_COST: Record<string, number> = {
  ai_reply:      1,
  campaign_send: 1,
}

export type CreditReason = 'ai_reply' | 'campaign_send' | 'purchase' | 'admin_grant'

export async function spendCredit(
  agencyId: string,
  reason: CreditReason,
  refId?: string,
): Promise<{ ok: boolean; balance: number }> {
  const cost = CREDIT_COST[reason] ?? 0
  if (cost === 0) return { ok: true, balance: 0 }
  return spendCredits(agencyId, cost, reason, refId)
}

export async function addCredits(
  agencyId: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
): Promise<number> {
  return addCreditsQuery(agencyId, amount, reason, refId)
}

export async function getBalance(agencyId: string): Promise<number> {
  return getAgencyBalance(agencyId)
}
