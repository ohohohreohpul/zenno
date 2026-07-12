'use client'

import { useEffect } from 'react'
import { ensureGsap, gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/marketing/gsap'

const START = 0.9 // reveal once an element's top passes 90% of the viewport

/**
 * Global scroll-reveal controller. Every `[data-reveal]` inside `.zx` rises +
 * fades in exactly once. Uses a per-element ScrollTrigger plus an immediate
 * pass for anything already above the fold — so deep-links, refreshes mid-page
 * and fast/programmatic scrolls all resolve correctly (batch missed those).
 */
export function RevealController() {
  useEffect(() => {
    ensureGsap()
    const els = gsap.utils.toArray<HTMLElement>('.zx [data-reveal]')
    if (!els.length) return

    if (prefersReducedMotion()) {
      gsap.set(els, { opacity: 1, y: 0 })
      return
    }

    const reveal = (el: HTMLElement) =>
      gsap.to(el, { opacity: 1, y: 0, duration: 0.85, ease: 'expo.out', overwrite: 'auto' })

    const triggers = els.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: `top ${START * 100}%`,
        once: true,
        onEnter: () => reveal(el),
      }),
    )

    // Anything already within/above the fold on load won't get an onEnter — show it now.
    const settle = () => {
      const vh = window.innerHeight
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < vh * START) reveal(el)
      })
      ScrollTrigger.refresh()
    }
    const t = setTimeout(settle, 260)

    return () => {
      clearTimeout(t)
      triggers.forEach((tr) => tr.kill())
    }
  }, [])

  return null
}
