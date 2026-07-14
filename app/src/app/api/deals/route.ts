import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createDeal, getDeals } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = requestWorkspaceId(req, req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID)

  return NextResponse.json({ data: await getDeals(workspaceId) })
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

  return NextResponse.json({ data: await createDeal({ ...parsed.data, workspaceId: requestWorkspaceId(req, parsed.data.workspaceId) }) }, { status: 201 })
}
