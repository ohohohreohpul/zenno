import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createScheduleSlot, deleteScheduleSlot, getScheduleSlot, getScheduleSlots } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

const createSchema = z.object({
  workspaceId: z.string().min(1).default('ws-1'),
  className: z.string().min(1).max(120),
  dayOfWeek: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMin: z.number().int().min(5).max(480).default(60),
  capacity: z.number().int().min(1).max(1000).default(1),
  instructor: z.string().max(120).default(''),
})

export async function GET(req: NextRequest) {
  const workspaceId = requestWorkspaceId(req, req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1')
  return NextResponse.json({ data: await getScheduleSlots(workspaceId) })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  return NextResponse.json({ data: await createScheduleSlot({ ...parsed.data, workspaceId: requestWorkspaceId(req, parsed.data.workspaceId), booked: 0 }) }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const slot = await getScheduleSlot(id) as { workspaceId?: string } | null
  if (!slot || slot.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Schedule slot not found' }, { status: 404 })
  await deleteScheduleSlot(id)
  return NextResponse.json({ ok: true })
}
