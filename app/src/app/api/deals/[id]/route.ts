import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteDeal, getDeal, updateDeal } from '@/lib/queries'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(200).optional(),
  value: z.number().min(0).optional(),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  channel: z.string().min(1).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const updated = await updateDeal(id, parsed.data)
  if (!updated) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  if (!await getDeal(id)) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  await deleteDeal(id)
  return NextResponse.json({ data: { id } })
}
