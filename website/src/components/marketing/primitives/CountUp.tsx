'use client'

import { useRef } from 'react'
import { useGsapContext, gsap, ScrollTrigger } from '@/lib/marketing/gsap'

interface CountUpProps {
  to: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

/** Tabular count-up that fires once when scrolled into view. */
export function CountUp({ to, prefix = '', suffix = '', duration = 1.4, className }: CountUpProps) {
  const elRef = useRef<HTMLSpanElement>(null)

  const scopeRef = useGsapContext(({ reduced }) => {
    const el = elRef.current
    if (!el) return
    const format = (v: number) => `${prefix}${Math.round(v)}${suffix}`

    if (reduced) {
      el.textContent = format(to)
      return
    }

    const obj = { v: 0 }
    el.textContent = format(0)
    gsap.to(obj, {
      v: to,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = format(obj.v)
      },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } as ScrollTrigger.Vars,
    })
  }, [to, prefix, suffix, duration])

  return (
    <span
      ref={(node) => {
        scopeRef.current = node
        elRef.current = node
      }}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {prefix}
      {to}
      {suffix}
    </span>
  )
}
