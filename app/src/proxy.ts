// Next.js 16 renamed `middleware.ts` to `proxy.ts` (middleware convention is
// deprecated). Proxy runs on the Node.js runtime by default in v16, so we can
// do full HMAC signature + expiry verification here with node:crypto.
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

export function proxy(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname
  const publicApi = path.startsWith('/api/auth/') || path.startsWith('/api/webhooks/') || path === '/api/webchat' || path === '/api/billing/webhook' || path === '/api/internal/campaigns/process'
  if (publicApi) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? verifySessionToken(token) : null

  if (!session) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
