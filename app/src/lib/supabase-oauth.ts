import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

interface PendingCookie {
  name: string
  value: string
  options: CookieOptions
}

export function createOAuthClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase Auth is not configured')

  const pendingCookies: PendingCookie[] = []
  const pendingHeaders: Record<string, string> = {}
  const client = createServerClient(url, key, {
    auth: { flowType: 'pkce' },
    cookies: {
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll(cookies, headers) {
        pendingCookies.push(...cookies)
        Object.assign(pendingHeaders, headers)
      },
    },
  })

  return {
    client,
    apply(response: NextResponse) {
      pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      Object.entries(pendingHeaders).forEach(([name, value]) => response.headers.set(name, value))
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
      return response
    },
  }
}

export function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedHost) return `${forwardedProto ?? 'https'}://${forwardedHost}`
  return request.nextUrl.origin
}

export function safeRedirectPath(value: string | null, fallback = '/dashboard'): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback
}
