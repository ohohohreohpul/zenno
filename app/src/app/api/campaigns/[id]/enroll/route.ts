import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDb } from '@/lib/db'
import { enrollContact } from '@/lib/campaign-engine'

const schema = z.object({
  contactId: z.string().min(1),
  workspaceId: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await connectDb()
  const { id: campaignId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  try {
    await enrollContact(campaignId, parsed.data.contactId, parsed.data.workspaceId)
    return NextResponse.json({ status: 'enrolled' })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Enrollment failed' }, { status: 500 })
  }
}
