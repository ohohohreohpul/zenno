import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { CommentAutomation } from '@/models/CommentAutomation'
import { serializeDoc } from '@/lib/serialize'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID

  if (IS_MOCK) {
    return NextResponse.json({ data: MockDB.getCommentAutomations(workspaceId) })
  }

  await connectDb()
  const automations = await CommentAutomation.find({ workspaceId }).sort({ createdAt: 1 }).lean()
  return NextResponse.json({ data: automations.map(serializeDoc) })
}

const createSchema = z.object({
  workspaceId: z.string().min(1).default(DEFAULT_WORKSPACE_ID),
  keyword: z.string().min(1).max(40).transform((s) => s.trim().toUpperCase()),
  postLabel: z.string().min(1).max(120),
  openingDm: z.string().min(1).max(1000),
  status: z.enum(['active', 'paused']).default('active'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  if (IS_MOCK) {
    const automation = MockDB.createCommentAutomation(parsed.data)
    return NextResponse.json({ data: automation }, { status: 201 })
  }

  await connectDb()
  const created = await CommentAutomation.create({
    ...parsed.data,
    stats: { commentsCaptured: 0, dmsSent: 0, booked: 0 },
  })
  return NextResponse.json({ data: serializeDoc(created.toObject()) }, { status: 201 })
}
