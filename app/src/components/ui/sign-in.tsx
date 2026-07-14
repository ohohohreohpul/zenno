'use client'

import Image from 'next/image'
import { Eye, EyeOff, MessageCircleMore, Sparkles, Workflow } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

export type AuthMode = 'login' | 'signup'

interface SignInPageProps {
  mode: AuthMode
  error?: string | null
  success?: string | null
  isSubmitting?: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onGoogleSignIn: () => void
  onModeChange: (mode: AuthMode) => void
}

const GoogleIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.6-5.6A19.9 19.9 0 0 0 24 4 20 20 0 1 0 44 24c0-1.3-.1-2.6-.4-3.9Z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.8 1.2 8 3l5.6-5.6A19.9 19.9 0 0 0 6.3 14.7Z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.3-.1-2.6-.4-3.9Z" />
  </svg>
)

function Field({ label, children, delay }: { label: string; children: ReactNode; delay: string }) {
  return (
    <div className={`auth-enter ${delay}`}>
      <label className="mb-2 block text-sm font-medium text-[#393531]">{label}</label>
      <div className="rounded-2xl border border-[#DED9D1] bg-[#FAF9F7] transition focus-within:border-[#8C8075] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#1A1714]/5">
        {children}
      </div>
    </div>
  )
}

const fieldClass = 'w-full rounded-2xl bg-transparent px-4 py-3.5 text-sm text-[#1A1714] outline-none placeholder:text-[#A09990]'

export function SignInPage({ mode, error, success, isSubmitting, onSubmit, onGoogleSignIn, onModeChange }: SignInPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const signup = mode === 'signup'

  return (
    <main className="grid min-h-[100dvh] bg-[#FDFCFA] lg:grid-cols-[minmax(480px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="flex min-h-[100dvh] items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[430px]">
          <Image src="/logo/logowithtext-2.svg" alt="Zenno" width={160} height={44} priority className="auth-enter auth-delay-1 mb-14 h-auto w-[132px]" />

          <div className="auth-enter auth-delay-2 mb-9">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8178]">{signup ? 'Start with Zenno' : 'Welcome back'}</p>
            <h1 className="text-[clamp(2.45rem,5vw,4rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#1A1714]">
              {signup ? 'Build your AI receptionist.' : 'Pick up where you left off.'}
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-6 text-[#6B6560]">
              {signup ? 'Create an account for your business and launch a sales agent that is always available.' : 'Sign in to manage conversations, campaigns, and every connected channel.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            className="auth-enter auth-delay-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#DED9D1] bg-white py-3.5 text-sm font-medium text-[#26211E] shadow-[0_1px_2px_rgba(26,23,20,0.03)] transition hover:border-[#C8C0B7] hover:bg-[#FAF9F7]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-enter auth-delay-4 my-7 flex items-center gap-4 text-xs uppercase tracking-[0.12em] text-[#A09990]">
            <span className="h-px flex-1 bg-[#E7E2DC]" />
            or use email
            <span className="h-px flex-1 bg-[#E7E2DC]" />
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {signup && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" delay="auth-delay-5">
                  <input className={fieldClass} name="name" autoComplete="name" minLength={2} required placeholder="Jane" />
                </Field>
                <Field label="Business name" delay="auth-delay-5">
                  <input className={fieldClass} name="businessName" autoComplete="organization" minLength={2} required placeholder="Acme Studio" />
                </Field>
              </div>
            )}

            <Field label="Email address" delay="auth-delay-5">
              <input className={fieldClass} name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
            </Field>

            <Field label="Password" delay="auth-delay-6">
              <div className="relative">
                <input className={`${fieldClass} pr-12`} name="password" type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : 1} required placeholder={signup ? 'At least 8 characters' : 'Enter your password'} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 flex items-center px-1 text-[#8A8178] transition hover:text-[#1A1714]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{error}</p>}
            {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-800">{success}</p>}

            <button type="submit" disabled={isSubmitting} className="auth-enter auth-delay-7 w-full rounded-2xl bg-[#1A1714] py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(26,23,20,0.14)] transition hover:bg-[#2E2926] disabled:cursor-wait disabled:opacity-65">
              {isSubmitting ? (signup ? 'Creating your workspace…' : 'Signing in…') : (signup ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <p className="auth-enter auth-delay-8 mt-7 text-center text-sm text-[#6B6560]">
            {signup ? 'Already have an account?' : 'New to Zenno?'}{' '}
            <button type="button" onClick={() => onModeChange(signup ? 'login' : 'signup')} className="font-semibold text-[#1A1714] underline-offset-4 hover:underline">
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>

      <section className="relative m-3 hidden min-h-[calc(100dvh-24px)] overflow-hidden rounded-[30px] bg-[#181512] text-white lg:block">
        <div className="absolute inset-0 auth-grid opacity-25" />
        <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-[#B59B7A]/25 blur-[110px]" />
        <div className="absolute -bottom-40 -left-28 h-[520px] w-[520px] rounded-full bg-[#6E7C62]/20 blur-[120px]" />
        <Image src="/logo/Vector-2.svg" alt="" width={463} height={466} priority className="absolute -right-16 bottom-[-70px] w-[52%] max-w-[520px] rotate-[-8deg] opacity-[0.075]" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Image src="/logo/logowithtext-1.svg" alt="Zenno" width={180} height={50} className="h-auto w-[142px]" />

          <div className="max-w-xl pb-8">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#BEB4A9]">Your business, always available</p>
            <h2 className="text-[clamp(3.1rem,5.4vw,6.6rem)] font-semibold leading-[0.88] tracking-[-0.065em]">
              One agent.<br />Every lead.<br /><span className="text-[#BEB4A9]">24/7.</span>
            </h2>
            <p className="mt-8 max-w-lg text-base leading-7 text-[#C8C0B7]">Train it on your business, connect the channels your customers already use, and let Zenno handle the first conversation.</p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                [MessageCircleMore, 'Natural replies'],
                [Workflow, 'Connected channels'],
                [Sparkles, 'Built around you'],
              ].map(([Icon, label]) => {
                const FeatureIcon = Icon as typeof MessageCircleMore
                return (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                    <FeatureIcon size={19} className="mb-5 text-[#D7CCBF]" />
                    <span className="text-xs leading-5 text-[#D7CCBF]">{label as string}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
