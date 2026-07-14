import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK } from '@/lib/mock-store'
import { LOCAL_USER, type SessionPayload } from '@/lib/auth'
import { createSupabaseAuthClient } from '@/lib/supabase'
import { sessionForSupabaseUser, withSessionCookie } from '@/lib/auth-server'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
const INVALID = 'Invalid email or password'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: INVALID }, { status: 401 })

  if (IS_MOCK) {
    if (parsed.data.email !== LOCAL_USER.email || parsed.data.password !== LOCAL_USER.password) return NextResponse.json({ error: INVALID }, { status: 401 })
    const session: SessionPayload = { userId: LOCAL_USER.userId, email: LOCAL_USER.email, name: LOCAL_USER.name, agencyId: 'agency-1', workspaceId: 'ws-1' }
    return withSessionCookie({ name: session.name, email: session.email }, session)
  }

  const auth = createSupabaseAuthClient()
  const { data, error } = await auth.auth.signInWithPassword({ email: parsed.data.email.toLowerCase(), password: parsed.data.password })
  if (error || !data.user) {
    const message = /confirm/i.test(error?.message ?? '') ? 'Confirm your email before signing in' : INVALID
    return NextResponse.json({ error: message }, { status: 401 })
  }
  try {
    const session = await sessionForSupabaseUser(data.user)
    return withSessionCookie({ name: session.name, email: session.email }, session)
  } catch (cause) {
    console.error('Account provisioning failed', cause)
    return NextResponse.json({ error: 'Your account is valid, but its workspace could not be prepared' }, { status: 500 })
  }
}
