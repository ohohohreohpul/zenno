import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { provisionAuthenticatedUser } from './queries'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, type SessionPayload } from './auth'

export async function sessionForSupabaseUser(user: User): Promise<SessionPayload> {
  if (!user.email) throw new Error('Authenticated user has no email')
  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : user.email.split('@')[0]
  const businessName = typeof user.user_metadata?.business_name === 'string' ? user.user_metadata.business_name : `${name}'s Business`
  const profile = await provisionAuthenticatedUser({ authUserId: user.id, email: user.email, name, businessName }) as {
    agencyId?: string
    workspaceId?: string
    userName?: string
  } | null
  if (!profile?.agencyId || !profile.workspaceId) throw new Error('Account workspace could not be provisioned')
  return { userId: user.id, email: user.email, name: profile.userName ?? name, agencyId: profile.agencyId, workspaceId: profile.workspaceId }
}

export function withSessionCookie<T>(data: T, session: SessionPayload, status = 200): NextResponse {
  const response = NextResponse.json({ data }, { status })
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return response
}
