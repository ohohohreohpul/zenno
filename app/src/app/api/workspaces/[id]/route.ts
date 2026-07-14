import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getWorkspace, updateWorkspace } from '@/lib/queries'
import { validTimeZone } from '@/lib/business-hours'
import { requestWorkspaceId } from '@/lib/request-context'

const businessHoursSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/).optional(),
  timezone: z.string().min(1).max(80).refine(validTimeZone, 'Invalid IANA timezone').optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  businessHours: businessHoursSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, 'No changes supplied')

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestedId } = await params
  const id = requestWorkspaceId(req, requestedId)
  const workspace = await getWorkspace(id)
  return workspace ? NextResponse.json({ data: workspace }) : NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestedId } = await params
  const id = requestWorkspaceId(req, requestedId)
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  try {
    const workspace = await updateWorkspace(id, parsed.data)
    return workspace ? NextResponse.json({ data: workspace }) : NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  } catch (error: unknown) {
    const duplicate = (error as { code?: string })?.code === '23505'
    return NextResponse.json({ error: duplicate ? 'Slug already taken' : 'Could not update workspace' }, { status: duplicate ? 409 : 500 })
  }
}
