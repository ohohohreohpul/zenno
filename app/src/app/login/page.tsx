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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Invalid email or password')
        return
      }
      router.push(searchParams.get('next') ?? '/dashboard')
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
            Welcome back
          </h1>

          <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 24 }}
            />

            {error && (
              <p style={{ fontSize: 13, color: COLORS.error, margin: '0 0 16px' }} role="alert">
                {error}
              </p>
            )}

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
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>

        <div
          style={{
            marginTop: 20,
            background: COLORS.accentSubtle,
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 12,
            color: COLORS.textSecondary,
            textAlign: 'center',
          }}
        >
          Demo access — demo@studio.com / demo1234
        </div>
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
