import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Deal } from '@/models/Deal'
import { serializeDoc } from '@/lib/serialize'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID

  if (IS_MOCK) {
    return NextResponse.json({ data: MockDB.getDeals(workspaceId) })
  }

  await connectDb()
  const deals = await Deal.find({ workspaceId }).sort({ createdAt: 1 }).lean()
  return NextResponse.json({ data: deals.map(serializeDoc) })
}

const createSchema = z.object({
  workspaceId: z.string().min(1).default(DEFAULT_WORKSPACE_ID),
  name: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  contactId: z.string().nullable().default(null),
  value: z.number().min(0),
  currency: z.string().min(1).max(8).default('THB'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('lead'),
  channel: z.string().min(1).default('whatsapp'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  if (IS_MOCK) {
    const deal = MockDB.createDeal(parsed.data)
    return NextResponse.json({ data: deal }, { status: 201 })
  }

  await connectDb()
  const created = await Deal.create(parsed.data)
  return NextResponse.json({ data: serializeDoc(created.toObject()) }, { status: 201 })
}
