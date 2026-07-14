import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteTask, getTask, updateTask } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

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

  const existing = await getTask(id) as { workspaceId?: string } | null
  if (!existing || existing.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const updated = await updateTask(id, patch)
  if (!updated) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  const existing = await getTask(id) as { workspaceId?: string } | null
  if (!existing || existing.workspaceId !== requestWorkspaceId(req)) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  await deleteTask(id)
  return NextResponse.json({ data: { id } })
}
