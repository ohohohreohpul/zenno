import type { IChannelConnection, ISendLimits } from '@/models/ChannelConnection'
import { reserveChannelSend } from './queries'

/**
 * Warm-up quotas for proactive/bulk sends from gateway-connected numbers.
 * Customer-initiated conversations and manual replies are never blocked by
 * this quota. Fresh numbers ramp linearly to full capacity, with a separate
 * stricter allowance for contacts who have never messaged the business.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type SendKind = 'reply' | 'bulk'

export interface SendReservation {
  ok: boolean
  reason: string | null
}

/** The cap in effect today, given how long the number has been warming up. */
export function normalizeSendLimits(limits?: Partial<ISendLimits> | null): ISendLimits {
  return { ...DEFAULT_LIMITS, ...(limits ?? {}) }
}

const DEFAULT_LIMITS: ISendLimits = {
  dailyCapBase: 50, dailyCapMax: 500,
  newContactCapBase: 0, newContactCapMax: 50,
  rampDays: 60, minDelaySeconds: 15,
}

export function currentWarmupDay(warmupStartedAt: Date | null): number {
  if (!warmupStartedAt) return 1
  return Math.max(1, Math.floor((Date.now() - new Date(warmupStartedAt).getTime()) / MS_PER_DAY) + 1)
}

export function capsForWarmupDay(rawLimits: Partial<ISendLimits>, day: number) {
  const limits = normalizeSendLimits(rawLimits)
  const rampDays = Math.max(1, limits.rampDays)
  const progress = rampDays === 1 ? 1 : Math.min(Math.max(day - 1, 0), rampDays - 1) / (rampDays - 1)
  const total = Math.round(limits.dailyCapBase + (limits.dailyCapMax - limits.dailyCapBase) * progress)
  const newContacts = Math.floor(limits.newContactCapBase + (limits.newContactCapMax - limits.newContactCapBase) * progress)
  return { total: Math.max(0, total), newContacts: Math.max(0, newContacts) }
}

export function currentDailyCap(limits: ISendLimits, warmupStartedAt: Date | null): number {
  return capsForWarmupDay(limits, currentWarmupDay(warmupStartedAt)).total
}

export function currentNewContactCap(limits: ISendLimits, warmupStartedAt: Date | null): number {
  return capsForWarmupDay(limits, currentWarmupDay(warmupStartedAt)).newContacts
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Reserve a proactive send against the connection's daily quota. Normal
 * replies bypass warm-up controls because the customer initiated or is
 * actively participating in the conversation. Campaigns and broadcasts
 * respect both the daily cap and the minimum delay.
 */
export async function tryReserveSend(
  conn: IChannelConnection,
  kind: SendKind,
  isNewContact = false,
): Promise<SendReservation> {
  if (kind === 'reply') return { ok: true, reason: null }

  const today = utcToday()
  const limits = normalizeSendLimits(conn.limits)
  const caps = capsForWarmupDay(limits, currentWarmupDay(conn.warmupStartedAt))

  if (limits.minDelaySeconds > 0 && conn.lastSentAt) {
    const elapsedSec = (Date.now() - new Date(conn.lastSentAt).getTime()) / 1000
    if (elapsedSec < limits.minDelaySeconds) {
      return {
        ok: false,
        reason: `Send throttled — minimum gap is ${limits.minDelaySeconds}s between bulk sends`,
      }
    }
  }

  // Conditional increment: only succeeds while under today's cap.
  const updated = await reserveChannelSend(conn.id, today, caps.total, isNewContact, caps.newContacts)

  if (!updated) {
    return {
      ok: false,
      reason: isNewContact && caps.newContacts === 0
        ? 'Cold outreach is disabled during the first warm-up days'
        : `Warm-up send limit reached (${caps.total} messages / ${caps.newContacts} new contacts today)`,
    }
  }
  return { ok: true, reason: null }
}
