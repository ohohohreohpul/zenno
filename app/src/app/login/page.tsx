'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SignInPage, type AuthMode } from '@/components/ui/sign-in'

function safeNext(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(() => searchParams.get('error'))
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const response = await fetch(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? (mode === 'signup' ? 'Could not create your account' : 'Invalid email or password'))
        return
      }
      if (body.data?.pendingConfirmation) {
        setSuccess(body.data.message)
        setMode('login')
        event.currentTarget.reset()
        return
      }
      router.push(safeNext(searchParams.get('next')))
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoogleSignIn() {
    const next = safeNext(searchParams.get('next'))
    window.location.assign(`/api/auth/google?next=${encodeURIComponent(next)}`)
  }

  return (
    <SignInPage
      mode={mode}
      error={error}
      success={success}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onGoogleSignIn={handleGoogleSignIn}
      onModeChange={(nextMode) => { setMode(nextMode); setError(null); setSuccess(null) }}
    />
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-[100dvh] bg-[#FDFCFA]" />}><AuthForm /></Suspense>
}
