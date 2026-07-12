'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/** Register GSAP plugins once, client-side only. */
export function ensureGsap(): void {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger)
  gsap.config({ nullTargetWarn: false })
  registered = true
}

/** True when the visitor asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** SSR-safe layout effect. */
export const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Scope GSAP work to a container element with automatic cleanup.
 * The callback receives the reduced-motion flag so animations can be skipped.
 */
export function useGsapContext(
  setup: (ctx: { reduced: boolean; scope: HTMLElement }) => void,
  deps: unknown[] = [],
) {
  const scopeRef = useRef<HTMLElement | null>(null)

  useIsoLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return
    ensureGsap()
    const reduced = prefersReducedMotion()
    const ctx = gsap.context(() => setup({ reduced, scope }), scope)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scopeRef
}

export { gsap, ScrollTrigger }
