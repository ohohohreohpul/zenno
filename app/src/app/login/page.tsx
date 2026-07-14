'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const COLORS = {
  bg: '#FDFCFA',
  card: '#FFFFFF',
  border: '#EEEBE6',
  textPrimary: '#1A1714',
  textSecondary: '#6B6560',
  textTertiary: '#A09990',
  accent: '#1A1714',
  accentSubtle: '#F0EDE8',
  error: '#DC2626',
} as const

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 14,
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.card,
  color: COLORS.textPrimary,
  outline: 'none',
  boxSizing: 'border-box',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      const res = await fetch(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? { name, businessName, email, password } : { email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? (mode === 'signup' ? 'Could not create account' : 'Invalid email or password'))
        return
      }
      const body = await res.json()
      if (body.data?.pendingConfirmation) {
        setSuccess(body.data.message)
        setMode('login')
        return
      }
      router.push(searchParams.get('next') ?? '/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: 400, maxWidth: '100%' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: COLORS.textTertiary,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Zen Studio Agency
        </div>

        <section
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            boxShadow: '0 8px 30px rgba(26, 23, 20, 0.06)',
            padding: '40px 36px',
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: COLORS.textPrimary,
              margin: '0 0 28px',
            }}
          >
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <label htmlFor="name" style={{ display: 'block', fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 }}>Your name</label>
                <input id="name" required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 18 }} />
                <label htmlFor="business" style={{ display: 'block', fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 }}>Business name</label>
                <input id="business" required minLength={2} autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={{ ...inputStyle, marginBottom: 18 }} />
              </>
            )}
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, marginBottom: 18 }}
            />

            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === 'signup' ? 8 : 1}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 24 }}
            />

            {error && (
              <p style={{ fontSize: 13, color: COLORS.error, margin: '0 0 16px' }} role="alert">
                {error}
              </p>
            )}
            {success && <p style={{ fontSize: 13, color: '#15803D', margin: '0 0 16px', lineHeight: 1.5 }} role="status">{success}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 10,
                border: 'none',
                background: COLORS.accent,
                color: COLORS.card,
                cursor: isSubmitting ? 'default' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: COLORS.textSecondary }}>
            {mode === 'signup' ? 'Already have an account?' : 'New to Zenno?'}{' '}
            <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setSuccess(null) }} style={{ border: 'none', background: 'transparent', padding: 0, color: COLORS.textPrimary, fontWeight: 600, cursor: 'pointer' }}>
              {mode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </section>

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
