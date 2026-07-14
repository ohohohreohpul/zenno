import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK } from '@/lib/mock-store'
import { getUserByEmail } from '@/lib/queries'
import {
  MOCK_DEMO_USER,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPassword,
  type SessionPayload,
} from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const INVALID_CREDENTIALS = 'Invalid email or password'

async function authenticate(email: string, password: string): Promise<SessionPayload | null> {
  if (IS_MOCK) {
    const isMatch = email === MOCK_DEMO_USER.email && password === MOCK_DEMO_USER.password
    if (!isMatch) return null
    return { userId: MOCK_DEMO_USER.userId, email: MOCK_DEMO_USER.email, name: MOCK_DEMO_USER.name }
  }

  const user = await getUserByEmail(email) as { id: string; email: string; passwordHash: string; name: string } | null
  if (!user) return null

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) return null

  return { userId: user.id, email: user.email, name: user.name }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 })
  }

  const session = await authenticate(parsed.data.email.toLowerCase(), parsed.data.password)
  if (!session) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 })
  }

  const res = NextResponse.json({ data: { name: session.name, email: session.email } })
  res.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return res
}
