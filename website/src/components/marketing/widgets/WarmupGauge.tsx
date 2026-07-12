'use client'

import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import styles from './WarmupGauge.module.css'

const BARS = [20, 40, 80, 120, 160, 200]

const STRINGS: Record<Lang, { label: string; range: string; day1: string; grows: string }> = {
  en: {
    label: 'Safe sending',
    range: '20 → 200 msgs / day',
    day1: 'day 1',
    grows: 'grows weekly with number age',
  },
  de: {
    label: 'Sicherer Versand',
    range: '20 → 200 Nachr. / Tag',
    day1: 'Tag 1',
    grows: 'wächst wöchentlich mit dem Alter der Nummer',
  },
}

interface WarmupGaugeProps {
  lang?: Lang
}

/** Safe-sending gauge: bars grow in sequence to show the warm-up ramp. */
export function WarmupGauge({ lang = 'en' }: WarmupGaugeProps) {
  const t = STRINGS[lang]

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const bars = gsap.utils.toArray<HTMLElement>('[data-bar]')
    gsap.set(bars, { scaleY: reduced ? 1 : 0, transformOrigin: 'bottom' })
    if (reduced) return
    gsap.to(bars, {
      scaleY: 1,
      duration: 0.7,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: scope, start: 'top 80%', once: true },
    })
  }, [])

  return (
    <div
      className={styles.wrap}
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className={styles.head}>
        <span className={styles.label}>{t.label}</span>
        <span className={styles.range}>{t.range}</span>
      </div>
      <div className={styles.bars}>
        {BARS.map((v, i) => (
          <div key={i} className={styles.col}>
            <span data-bar className={styles.bar} style={{ height: `${18 + i * 16}%` }} />
          </div>
        ))}
      </div>
      <div className={styles.axis}>
        <span>{t.day1}</span>
        <span>{t.grows}</span>
      </div>
    </div>
  )
}
