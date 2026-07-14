import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createTask, getTasks } from '@/lib/queries'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID

  return NextResponse.json({ data: await getTasks(workspaceId) })
}

const createSchema = z.object({
  workspaceId: z.string().min(1).default(DEFAULT_WORKSPACE_ID),
  title: z.string().min(1).max(300),
  contactName: z.string().max(200).nullable().default(null),
  contactId: z.string().nullable().default(null),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']).default('todo'),
  dueDate: z.string().datetime().nullable().default(null),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { dueDate, ...rest } = parsed.data
  const taskData = { ...rest, dueDate: dueDate ? new Date(dueDate) : null }

  return NextResponse.json({ data: await createTask(taskData) }, { status: 201 })
}
