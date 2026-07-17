import { NextRequest, NextResponse } from 'next/server'
import { sessionForSupabaseUser, setSessionCookie } from '@/lib/auth-server'
import { createOAuthClient, requestOrigin, safeRedirectPath } from '@/lib/supabase-oauth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = requestOrigin(request)
  const next = safeRedirectPath(request.nextUrl.searchParams.get('next'))
  const code = request.nextUrl.searchParams.get('code')
  const providerError = request.nextUrl.searchParams.get('error_description') ?? request.nextUrl.searchParams.get('error')

  if (!code || providerError) return authError(origin, providerError ?? 'Google did not return an authorization code')

  try {
    const oauth = createOAuthClient(request)
    const { data, error } = await oauth.client.auth.exchangeCodeForSession(code)
    if (error || !data.user) throw error ?? new Error('Google session was not returned')

    const session = await sessionForSupabaseUser(data.user)
    const response = NextResponse.redirect(new URL(next, origin))
    setSessionCookie(response, session)
    return oauth.apply(response)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown error'
    console.error('Google OAuth callback failed:', { message, code: code?.slice(0, 20), cause })
    return authError(origin, `Google sign-in failed: ${message}`)
  }
}

function authError(origin: string, message: string): NextResponse {
  const login = new URL('/login', origin)
  login.searchParams.set('error', message)
  return NextResponse.redirect(login)
}
