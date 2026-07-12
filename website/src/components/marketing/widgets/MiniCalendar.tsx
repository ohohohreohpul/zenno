'use client'

import { useMemo } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import styles from './MiniCalendar.module.css'

const TARGET_INDEX = 8

const STRINGS: Record<Lang, { day: string; booked: string }> = {
  en: { day: 'Sat', booked: '● Sat 10:00' },
  de: { day: 'Sa.', booked: '● Sa. 10:00' },
}

interface MiniCalendarProps {
  lang?: Lang
}

/** Tiny calendar-fill mockup: a grid of slots, one fills green as the agent books it. */
export function MiniCalendar({ lang = 'en' }: MiniCalendarProps) {
  const cells = useMemo(() => Array.from({ length: 14 }, (_, i) => i), [])
  const t = STRINGS[lang]

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const target = scope.querySelector<HTMLElement>('[data-slot-target]')
    if (!target) return

    if (reduced) {
      target.classList.add(styles.filled)
      return
    }

    gsap.fromTo(
      target,
      { scale: 1 },
      {
        scale: 1.08,
        duration: 0.35,
        ease: 'back.out(2.4)',
        yoyo: true,
        repeat: 1,
        scrollTrigger: { trigger: scope, start: 'top 75%', once: true },
        onStart: () => target.classList.add(styles.filled),
      },
    )
  }, [])

  return (
    <div
      className={styles.wrap}
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className={styles.head}>
        <span>{t.day}</span>
        <span className={styles.headBooked}>{t.booked}</span>
      </div>
      <div className={styles.grid}>
        {cells.map((i) => (
          <span
            key={i}
            data-slot-target={i === TARGET_INDEX ? '' : undefined}
            className={`${styles.cell} ${i === TARGET_INDEX ? styles.target : ''}`}
          >
            {i === TARGET_INDEX && <em className={styles.check}>✓</em>}
          </span>
        ))}
      </div>
    </div>
  )
}
