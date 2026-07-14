import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAppointment, getAppointments } from '@/lib/queries'
import { requestWorkspaceId } from '@/lib/request-context'

const DEFAULT_WORKSPACE_ID = 'ws-1'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = requestWorkspaceId(req, req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID)

  return NextResponse.json({ data: await getAppointments(workspaceId) })
}

const createSchema = z.object({
  workspaceId: z.string().min(1).default(DEFAULT_WORKSPACE_ID),
  contactName: z.string().min(1).max(200),
  contactId: z.string().nullable().default(null),
  className: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  durationMin: z.number().int().min(5).max(480).default(60),
  channel: z.string().min(1).default('whatsapp'),
  kind: z.enum(['trial', 'regular', 'consult']).default('regular'),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { startsAt, ...rest } = parsed.data
  const apptData = { ...rest, workspaceId: requestWorkspaceId(req, rest.workspaceId), startsAt: new Date(startsAt) }

  return NextResponse.json({ data: await createAppointment(apptData) }, { status: 201 })
}
