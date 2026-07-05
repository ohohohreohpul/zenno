import mongoose from 'mongoose'
import { connectDb } from './db'
import { Agency } from '@/models/Agency'
import { CreditLedger } from '@/models/CreditLedger'

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
  await connectDb()

  const cost = CREDIT_COST[reason] ?? 0
  if (cost === 0) return { ok: true, balance: 0 }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const agency = await Agency.findById(agencyId).session(session)
    if (!agency || agency.credits < cost) {
      await session.abortTransaction()
      return { ok: false, balance: agency?.credits ?? 0 }
    }

    const newBalance = agency.credits - cost
    agency.credits = newBalance
    await agency.save({ session })

    await CreditLedger.create([{
      agencyId,
      delta: -cost,
      reason,
      refId: refId ?? null,
      balance: newBalance,
    }], { session })

    await session.commitTransaction()
    return { ok: true, balance: newBalance }
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}

export async function addCredits(
  agencyId: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
): Promise<number> {
  await connectDb()

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const agency = await Agency.findById(agencyId).session(session)
    if (!agency) throw new Error(`Agency not found: ${agencyId}`)

    const newBalance = agency.credits + amount
    agency.credits = newBalance
    await agency.save({ session })

    await CreditLedger.create([{
      agencyId,
      delta: amount,
      reason,
      refId: refId ?? null,
      balance: newBalance,
    }], { session })

    await session.commitTransaction()
    return newBalance
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}

export async function getBalance(agencyId: string): Promise<number> {
  await connectDb()
  const agency = await Agency.findById(agencyId).select('credits').lean()
  if (!agency) throw new Error(`Agency not found: ${agencyId}`)
  return agency.credits
}
