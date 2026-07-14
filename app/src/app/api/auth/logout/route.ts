import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const res = NextResponse.json({ data: { ok: true } })
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  })
  request.cookies.getAll().filter(({ name }) => name.startsWith('sb-')).forEach(({ name }) => {
    res.cookies.set(name, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
  })
  res.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
  return res
}
