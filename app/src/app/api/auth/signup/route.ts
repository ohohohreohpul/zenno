import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAuthClient } from '@/lib/supabase'
import { sessionForSupabaseUser, withSessionCookie } from '@/lib/auth-server'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  businessName: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Enter your name, business, a valid email, and a password of at least 8 characters' }, { status: 422 })

  const auth = createSupabaseAuthClient()
  const { data, error } = await auth.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: { data: { name: parsed.data.name, business_name: parsed.data.businessName } },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })

  if (!data.session || !data.user) {
    return NextResponse.json({ data: { pendingConfirmation: true, message: 'Check your email to confirm your account, then sign in.' } }, { status: 201 })
  }

  try {
    const session = await sessionForSupabaseUser(data.user)
    return withSessionCookie({ pendingConfirmation: false, name: session.name, email: session.email }, session, 201)
  } catch (cause) {
    console.error('Signup provisioning failed', cause)
    return NextResponse.json({ error: 'Your account was created, but its workspace could not be prepared. Sign in to retry.' }, { status: 500 })
  }
}
