'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import { SectionHeader } from './primitives/SectionHeader'
import { CountUp } from './primitives/CountUp'
import styles from './ProductPreview.module.css'

const STRINGS: Record<
  Lang,
  {
    kicker: string
    titlePre: string
    titleGhost: string
    lead: string
    navItems: string[]
    bookings: string
    chats: string
    sent: string
    booked: string
  }
> = {
  en: {
    kicker: 'Trust at a glance',
    titlePre: 'One dashboard.',
    titleGhost: 'Bookings up top.',
    lead: 'The north-star number leads — not message counts. See exactly what the agent handled while you were away.',
    navItems: ['Inbox', 'Bookings', 'Contacts', 'Campaigns', 'Settings'],
    bookings: 'Bookings',
    chats: 'Chats',
    sent: 'Sent',
    booked: 'booked',
  },
  de: {
    kicker: 'Vertrauen auf einen Blick',
    titlePre: 'Ein Dashboard.',
    titleGhost: 'Buchungen ganz oben.',
    lead: 'Die Nordstern-Zahl führt — nicht die Nachrichtenanzahl. Sehen Sie genau, was der Agent während Ihrer Abwesenheit erledigt hat.',
    navItems: ['Posteingang', 'Buchungen', 'Kontakte', 'Kampagnen', 'Einstellungen'],
    bookings: 'Buchungen',
    chats: 'Chats',
    sent: 'Gesendet',
    booked: 'gebucht',
  },
}

interface ProductPreviewProps {
  lang?: Lang
}

export function ProductPreview({ lang = 'en' }: ProductPreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const t = STRINGS[lang]

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const frame = frameRef.current
    if (!frame || reduced) return
    // subtle 3D settle + scrub parallax
    gsap.fromTo(
      frame,
      { rotateX: 9, y: 40 },
      {
        rotateX: 0,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top 80%', end: 'top 30%', scrub: 0.6 },
      },
    )
    gsap.to(scope.querySelectorAll('[data-bar-grow]'), {
      scaleY: 1,
      transformOrigin: 'bottom',
      duration: 0.8,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: frame, start: 'top 70%', once: true },
    })
  }, [])

  return (
    <section
      className="pad-y"
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className="wrap">
        <SectionHeader
          align="center"
          kicker={t.kicker}
          title={
            <>
              {t.titlePre} <span className="ghost-word">{t.titleGhost}</span>
            </>
          }
          lead={t.lead}
        />

        <div className={styles.perspective}>
          <div ref={frameRef} className={styles.frame} data-reveal>
            <div className={styles.chrome}>
              <span /> <span /> <span />
              <em>app.zenno.ai / dashboard</em>
            </div>
            <div className={styles.body}>
              <aside className={styles.side}>
                <span className={styles.logo} />
                {t.navItems.map((s, i) => (
                  <span key={s} className={`${styles.nav} ${i === 1 ? styles.active : ''}`}>
                    {s}
                  </span>
                ))}
              </aside>
              <main className={styles.main}>
                <div className={styles.stats}>
                  <div className={`${styles.tile} ${styles.dark}`}>
                    <span className={styles.tLabel}>{t.bookings}</span>
                    <strong>
                      <CountUp to={12} />
                    </strong>
                  </div>
                  <div className={styles.tile}>
                    <span className={styles.tLabel}>{t.chats}</span>
                    <strong>
                      <CountUp to={48} />
                    </strong>
                  </div>
                  <div className={styles.tile}>
                    <span className={styles.tLabel}>{t.sent}</span>
                    <strong>
                      <CountUp to={173} />
                    </strong>
                  </div>
                </div>
                <div className={styles.panels}>
                  <div className={styles.chart}>
                    <span className={styles.pTitle} />
                    <div className={styles.bars}>
                      {[40, 55, 35, 70, 50, 85, 65].map((h, i) => (
                        <span
                          key={i}
                          data-bar-grow
                          className={styles.chartBar}
                          style={{ height: `${h}%`, transform: 'scaleY(0)' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.feed}>
                    <span className={styles.pTitle} />
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={styles.feedRow}>
                        <i />
                        {i === 0 && <b className={styles.booked}>{t.booked}</b>}
                      </span>
                    ))}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
