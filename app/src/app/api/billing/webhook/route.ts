import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { addCredits } from '@/lib/credits'
import { connectDb } from '@/lib/db'
import { StripeEvent } from '@/models/StripeEvent'
import type Stripe from 'stripe'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await connectDb()

  // Idempotency
  const existing = await StripeEvent.findById(event.id).lean()
  if (existing?.processed) return NextResponse.json({ status: 'already_processed' })

  await StripeEvent.findByIdAndUpdate(event.id, { type: event.type }, { upsert: true })

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
  }

  await StripeEvent.findByIdAndUpdate(event.id, { processed: true })
  return NextResponse.json({ status: 'ok' })
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const agencyId = session.metadata?.agencyId
  const credits = Number(session.metadata?.credits ?? 0)
  if (!agencyId || !credits) return
  await addCredits(agencyId, credits, 'purchase', session.payment_intent as string)
}
