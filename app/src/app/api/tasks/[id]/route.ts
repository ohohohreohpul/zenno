import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Task } from '@/models/Task'
import { serializeDoc } from '@/lib/serialize'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  contactName: z.string().max(200).nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { dueDate, ...rest } = parsed.data
  const patch = dueDate !== undefined
    ? { ...rest, dueDate: dueDate ? new Date(dueDate) : null }
    : rest

  if (IS_MOCK) {
    const updated = MockDB.updateTask(id, patch)
    if (!updated) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json({ data: updated })
  }

  await connectDb()
  const updated = await Task.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
  if (!updated) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json({ data: serializeDoc(updated) })
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  if (IS_MOCK) {
    const removed = MockDB.deleteTask(id)
    if (!removed) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json({ data: { id } })
  }

  await connectDb()
  const deleted = await Task.findByIdAndDelete(id).lean()
  if (!deleted) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json({ data: { id } })
}
