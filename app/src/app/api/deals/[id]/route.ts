import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Deal } from '@/models/Deal'
import { serializeDoc } from '@/lib/serialize'

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

  if (IS_MOCK) {
    const updated = MockDB.updateDeal(id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    return NextResponse.json({ data: updated })
  }

  await connectDb()
  const updated = await Deal.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean()
  if (!updated) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  return NextResponse.json({ data: serializeDoc(updated) })
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  if (IS_MOCK) {
    const removed = MockDB.deleteDeal(id)
    if (!removed) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    return NextResponse.json({ data: { id } })
  }

  await connectDb()
  const deleted = await Deal.findByIdAndDelete(id).lean()
  if (!deleted) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  return NextResponse.json({ data: { id } })
}
