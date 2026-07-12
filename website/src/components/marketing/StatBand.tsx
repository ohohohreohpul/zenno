'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import { CountUp } from './primitives/CountUp'
import styles from './StatBand.module.css'

const STRINGS: Record<
  Lang,
  {
    kicker: string
    headline: string
    stats: { value: number; prefix?: string; suffix?: string; label: string; hero?: boolean }[]
    foot: string
  }
> = {
  en: {
    kicker: 'The only number that matters',
    headline: 'Bookings while you sleep',
    stats: [
      { value: 38, prefix: '+', label: 'bookings created this week', hero: true },
      { value: 9, suffix: ' sec', label: 'median first reply' },
      { value: 71, suffix: '%', label: 'handled end-to-end' },
      { value: 0, label: 'missed messages' },
    ],
    foot: 'Placeholder metrics for layout — real proof lands after the first pilot.',
  },
  de: {
    kicker: 'Die einzige Zahl, die zählt',
    headline: 'Buchungen, während Sie schlafen',
    stats: [
      { value: 38, prefix: '+', label: 'Buchungen diese Woche', hero: true },
      { value: 9, suffix: ' Sek.', label: 'mittlere Erstantwort' },
      { value: 71, suffix: '%', label: 'vollständig automatisch gelöst' },
      { value: 0, label: 'verpasste Nachrichten' },
    ],
    foot: 'Platzhalter-Werte für das Layout — echte Zahlen folgen nach dem ersten Pilotbetrieb.',
  },
}

interface StatBandProps {
  lang?: Lang
}

export function StatBand({ lang = 'en' }: StatBandProps) {
  const barRef = useRef<HTMLSpanElement>(null)
  const t = STRINGS[lang]

  const scopeRef = useGsapContext(({ reduced }) => {
    const bar = barRef.current
    if (!bar || reduced) return
    gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: bar, start: 'top 85%', once: true },
      },
    )
  }, [])

  return (
    <section
      className={`pad-y ${styles.wrapOuter}`}
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className="wrap">
        <div className={styles.band} data-reveal>
          <div className={styles.top}>
            <span className={styles.kicker}>{t.kicker}</span>
            <h2 className={styles.headline}>{t.headline}</h2>
            <span ref={barRef} className={styles.bar} aria-hidden />
          </div>

          <div className={styles.grid}>
            {t.stats.map((s) => (
              <div key={s.label} className={`${styles.stat} ${s.hero ? styles.hero : ''}`}>
                <CountUp
                  to={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  className={styles.num}
                />
                <span className={styles.label}>{s.label}</span>
              </div>
            ))}
          </div>

          <p className={styles.foot}>{t.foot}</p>
        </div>
      </div>
    </section>
  )
}
