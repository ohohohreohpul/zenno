'use client'

import { useRef, type ReactNode } from 'react'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'

interface MagneticProps {
  children: ReactNode
  strength?: number
  className?: string
}

/**
 * Wraps an interactive element so it drifts toward the cursor and springs back.
 * Disabled for reduced-motion and coarse (touch) pointers.
 */
export function Magnetic({ children, strength = 0.35, className }: MagneticProps) {
  const innerRef = useRef<HTMLSpanElement>(null)

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const inner = innerRef.current
    if (!inner || reduced) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const xTo = gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'expo.out' })
    const yTo = gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'expo.out' })

    const onMove = (e: MouseEvent) => {
      const r = scope.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * strength)
      yTo((e.clientY - (r.top + r.height / 2)) * strength)
    }
    const onLeave = () => {
      xTo(0)
      yTo(0)
    }
    scope.addEventListener('mousemove', onMove)
    scope.addEventListener('mouseleave', onLeave)
    return () => {
      scope.removeEventListener('mousemove', onMove)
      scope.removeEventListener('mouseleave', onLeave)
    }
  }, [strength])

  return (
    <span
      ref={(node) => {
        scopeRef.current = node
      }}
      className={className}
      style={{ display: 'inline-flex' }}
    >
      <span ref={innerRef} style={{ display: 'inline-flex' }}>
        {children}
      </span>
    </span>
  )
}
