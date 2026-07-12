'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { appHref } from '@/lib/marketing/config'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import { Magnetic } from './primitives/Magnetic'
import styles from './ClosingCta.module.css'

const STRINGS: Record<
  Lang,
  { typing: string; line1: string; line2: string; sub: string; ctaPrimary: string; ctaSecondary: string; note: string }
> = {
  en: {
    typing: 'Someone is typing…',
    line1: 'Your next customer',
    line2: 'is typing right now.',
    sub: 'Answer them in nine seconds and book them before they scroll away.',
    ctaPrimary: 'Get started free',
    ctaSecondary: 'See it book a class',
    note: 'Their own number · live in minutes · no card required',
  },
  de: {
    typing: 'Jemand schreibt gerade…',
    line1: 'Der nächste Kunde',
    line2: 'tippt gerade jetzt.',
    sub: 'Antworten Sie in neun Sekunden und buchen Sie, bevor weitergescrollt wird.',
    ctaPrimary: 'Kostenlos starten',
    ctaSecondary: 'Live-Buchung ansehen',
    note: 'Eigene Nummer · startklar in Minuten · keine Kreditkarte nötig',
  },
}

interface ClosingCtaProps {
  lang?: Lang
}

export function ClosingCta({ lang = 'en' }: ClosingCtaProps) {
  const linesRef = useRef<HTMLHeadingElement>(null)
  const t = STRINGS[lang]
  const home = lang === 'de' ? '/de' : '/'

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const lines = gsap.utils.toArray<HTMLElement>('[data-cta-line]')
    if (reduced) {
      gsap.set(lines, { yPercent: 0 })
      return
    }
    gsap.set(lines, { yPercent: 110 })
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.1,
      scrollTrigger: { trigger: scope, start: 'top 72%', once: true },
    })
  }, [])

  return (
    <section
      id="demo"
      className="pad-y"
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className="wrap">
        <div className={styles.card}>
          <div className={styles.glow} aria-hidden />
          <span className={styles.pill}>
            <span className={styles.typing}>
              <i /> <i /> <i />
            </span>
            {t.typing}
          </span>

          <h2 ref={linesRef} className={styles.headline}>
            {[t.line1, t.line2].map((l, i) => (
              <span key={i} className={styles.mask}>
                <span data-cta-line className={styles.line}>
                  {l}
                </span>
              </span>
            ))}
          </h2>

          <p className={styles.sub}>{t.sub}</p>

          <div className={styles.actions}>
            <Magnetic strength={0.4}>
              <a href={appHref()} className="btn on-dark">
                {t.ctaPrimary} <span className="arrow">→</span>
              </a>
            </Magnetic>
            <a href={`${home}#top`} className={`btn ${styles.ghostDark}`}>
              {t.ctaSecondary}
            </a>
          </div>
          <span className={styles.note}>{t.note}</span>
        </div>
      </div>
    </section>
  )
}
