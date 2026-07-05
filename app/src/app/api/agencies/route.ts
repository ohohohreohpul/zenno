import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDb } from '@/lib/db'
import { Agency } from '@/models/Agency'

const createSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  ownerId: z.string().min(1),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  await connectDb()

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { name, slug, ownerId, brandColor } = parsed.data

  try {
    const agency = await Agency.create({
      name, slug, ownerId,
      brandColor: brandColor ?? '#000000',
      credits: 50,
    })
    return NextResponse.json({ data: agency }, { status: 201 })
  } catch (err: unknown) {
    const isDuplicate = (err as any)?.code === 11000
    return NextResponse.json(
      { error: isDuplicate ? 'Slug already taken' : 'Failed to create agency' },
      { status: isDuplicate ? 409 : 500 },
    )
  }
}
