import type { IChannelConnection, ISendLimits } from '@/models/ChannelConnection'
import { reserveChannelSend } from './queries'

/**
 * Warm-up quotas for gateway-connected numbers. Fresh numbers get a small
 * daily allowance that doubles each week until it reaches the configured
 * ceiling — sending full-volume from a day-old number is the fastest way
 * to get it flagged.
 */

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export type SendKind = 'reply' | 'bulk'

export interface SendReservation {
  ok: boolean
  reason: string | null
}

/** The cap in effect today, given how long the number has been warming up. */
export function currentDailyCap(limits: ISendLimits, warmupStartedAt: Date | null): number {
  const base = Math.max(1, limits.dailyCapBase)
  const max = Math.max(base, limits.dailyCapMax)
  if (!warmupStartedAt) return base
  const weeks = Math.floor((Date.now() - new Date(warmupStartedAt).getTime()) / MS_PER_WEEK)
  const ramped = base * 2 ** Math.max(0, weeks)
  return Math.min(ramped, max)
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Reserve one send against the connection's daily quota. Conversational
 * replies skip the inter-send delay (a customer is waiting) but still count
 * toward the cap; bulk sends (campaigns, broadcasts) respect both.
 */
export async function tryReserveSend(
  conn: IChannelConnection,
  kind: SendKind,
): Promise<SendReservation> {
  const today = utcToday()
  const cap = currentDailyCap(conn.limits, conn.warmupStartedAt)

  if (kind === 'bulk' && conn.limits.minDelaySeconds > 0 && conn.lastSentAt) {
    const elapsedSec = (Date.now() - new Date(conn.lastSentAt).getTime()) / 1000
    if (elapsedSec < conn.limits.minDelaySeconds) {
      return {
        ok: false,
        reason: `Send throttled — minimum gap is ${conn.limits.minDelaySeconds}s between bulk sends`,
      }
    }
  }

  // Conditional increment: only succeeds while under today's cap.
  const updated = await reserveChannelSend(conn.id, today, cap)

  if (!updated) {
    return {
      ok: false,
      reason: `Daily send cap reached (${cap}/day during warm-up) — resumes tomorrow`,
    }
  }
  return { ok: true, reason: null }
}
