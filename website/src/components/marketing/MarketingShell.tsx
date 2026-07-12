'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { ensureGsap, prefersReducedMotion, ScrollTrigger } from '@/lib/marketing/gsap'
import { RevealController } from './primitives/Reveal'

interface MarketingShellProps {
  children: ReactNode
  /**
   * The root layout can't know the route's locale without sacrificing static
   * generation (headers() forces the whole app dynamic) — so pages that render
   * in German correct `<html lang>` here instead, client-side, at zero cost.
   */
  lang?: Lang
}

/**
 * Root client wrapper for the marketing experience:
 * - applies the `.zx` style scope + reduced-motion flag
 * - boots GSAP + a global reveal controller
 * - keeps ScrollTrigger in sync on resize
 */
export function MarketingShell({ children, lang }: MarketingShellProps) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    ensureGsap()
    setReduced(prefersReducedMotion())
    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (lang) document.documentElement.lang = lang
  }, [lang])

  return (
    <div className={`zx ${reduced ? 'reduce' : ''}`}>
      <div className="grain" aria-hidden />
      <RevealController />
      {children}
    </div>
  )
}
