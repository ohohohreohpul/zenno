import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCheckoutSession, CreditPackId, isStripeConfigured } from '@/lib/stripe'
import { requestAgencyId } from '@/lib/request-context'

const schema = z.object({
  agencyId: z.string().uuid(),
  packId: z.enum(['pack_500', 'pack_2000', 'pack_10000']),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Payments are not available yet' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { packId } = parsed.data
  const agencyId = requestAgencyId(req, parsed.data.agencyId)
  const origin = req.nextUrl.origin

  try {
    const url = await createCheckoutSession(
      agencyId,
      packId as CreditPackId,
      `${origin}/dashboard/billing?success=1`,
      `${origin}/dashboard/billing?cancel=1`,
    )
    return NextResponse.json({ url })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 },
    )
  }
}
