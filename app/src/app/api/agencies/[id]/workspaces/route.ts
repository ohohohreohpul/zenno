import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createWorkspace, getWorkspacesByAgency } from '@/lib/queries'

const createSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: agencyId } = await params
  const workspaces = await getWorkspacesByAgency(agencyId)
  return NextResponse.json({ data: workspaces })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: agencyId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  try {
    const workspace = await createWorkspace({ ...parsed.data, agencyId })
    return NextResponse.json({ data: workspace }, { status: 201 })
  } catch (err: unknown) {
    const isDuplicate = (err as { code?: string })?.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? 'Slug already taken' : 'Failed to create workspace' },
      { status: isDuplicate ? 409 : 500 },
    )
  }
}
