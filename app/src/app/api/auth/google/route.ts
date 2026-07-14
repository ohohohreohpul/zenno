import { NextRequest, NextResponse } from 'next/server'
import { createOAuthClient, requestOrigin, safeRedirectPath } from '@/lib/supabase-oauth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeRedirectPath(request.nextUrl.searchParams.get('next'))
  const origin = requestOrigin(request)
  const callback = new URL('/api/auth/google/callback', origin)
  callback.searchParams.set('next', next)

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !publishableKey) throw new Error('Supabase Auth is not configured')
    const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
      cache: 'no-store',
    })
    const settings = await settingsResponse.json() as { external?: { google?: boolean } }
    if (!settingsResponse.ok || settings.external?.google !== true) throw new Error('Google provider is disabled')

    const oauth = createOAuthClient(request)
    const { data, error } = await oauth.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    })
    if (error || !data.url) throw error ?? new Error('Google sign-in could not be started')
    return oauth.apply(NextResponse.redirect(data.url))
  } catch (cause) {
    console.error('Google OAuth start failed', cause)
    const login = new URL('/login', origin)
    login.searchParams.set('error', 'Google sign-in is not enabled yet. Use email for now.')
    return NextResponse.redirect(login)
  }
}
