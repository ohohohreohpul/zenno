import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateCommentAutomation } from '@/lib/queries'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  keyword: z.string().min(1).max(40).transform((s) => s.trim().toUpperCase()).optional(),
  postLabel: z.string().min(1).max(120).optional(),
  openingDm: z.string().min(1).max(1000).optional(),
  status: z.enum(['active', 'paused']).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const updated = await updateCommentAutomation(id, parsed.data)
  if (!updated) return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
  return NextResponse.json({ data: updated })
}
