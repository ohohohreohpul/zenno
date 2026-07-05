import Stripe from 'stripe'

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export const CREDIT_PACKS = [
  { id: 'pack_500',   credits: 500,   priceId: process.env.STRIPE_PRICE_500   ?? '' },
  { id: 'pack_2000',  credits: 2000,  priceId: process.env.STRIPE_PRICE_2000  ?? '' },
  { id: 'pack_10000', credits: 10000, priceId: process.env.STRIPE_PRICE_10000 ?? '' },
] as const

export type CreditPackId = (typeof CREDIT_PACKS)[number]['id']

export function packByPriceId(priceId: string) {
  return CREDIT_PACKS.find((p) => p.priceId === priceId) ?? null
}

export async function createCheckoutSession(
  agencyId: string,
  packId: CreditPackId,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const pack = CREDIT_PACKS.find((p) => p.id === packId)
  if (!pack) throw new Error(`Unknown pack: ${packId}`)

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: pack.priceId, quantity: 1 }],
    metadata: { agencyId, packId, credits: String(pack.credits) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  if (!session.url) throw new Error('Stripe session URL missing')
  return session.url
}
