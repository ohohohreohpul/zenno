'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import { SectionHeader } from './primitives/SectionHeader'
import styles from './HowItWorks.module.css'

const STRINGS: Record<
  Lang,
  {
    kicker: string
    titlePre: string
    titleGhost: string
    titlePost: string
    steps: { n: string; title: string; body: string; tag: string }[]
  }
> = {
  en: {
    kicker: 'Live in minutes',
    titlePre: 'Three steps from',
    titleGhost: 'nobody answers',
    titlePost: 'to fully booked.',
    steps: [
      {
        n: '01',
        title: 'Connect a channel',
        body: 'Scan a QR with your own WhatsApp, or paste a Telegram token. Minutes, not weeks — no Meta verification, no rented numbers.',
        tag: 'WhatsApp · Telegram · LINE · Web',
      },
      {
        n: '02',
        title: 'AI learns your business',
        body: 'Point it at your website. Zenno scrapes it, writes the agent’s knowledge and tone, and lets you test-drive it before it goes live.',
        tag: 'URL → knowledge → test drive',
      },
      {
        n: '03',
        title: 'Bookings roll in',
        body: 'The agent answers, qualifies, and books straight into your calendar — while you teach, treat, or sleep. You watch the daily summary.',
        tag: 'Calendar fills · 24/7',
      },
    ],
  },
  de: {
    kicker: 'Startklar in Minuten',
    titlePre: 'Drei Schritte von',
    titleGhost: 'niemand antwortet',
    titlePost: 'bis ausgebucht.',
    steps: [
      {
        n: '01',
        title: 'Kanal verbinden',
        body: 'QR-Code mit dem eigenen WhatsApp scannen oder einen Telegram-Token einfügen. Minuten statt Wochen — keine Meta-Verifizierung, keine gemieteten Nummern.',
        tag: 'WhatsApp · Telegram · LINE · Web',
      },
      {
        n: '02',
        title: 'KI lernt den Betrieb kennen',
        body: 'Website-URL angeben. Zenno durchsucht sie, schreibt das Wissen und den Ton des Agenten und lässt vor dem Livegang eine Testfahrt zu.',
        tag: 'URL → Wissen → Testlauf',
      },
      {
        n: '03',
        title: 'Buchungen kommen rein',
        body: 'Der Agent antwortet, qualifiziert und bucht direkt in den Kalender — während unterrichtet, behandelt oder geschlafen wird. Die Tageszusammenfassung zeigt alles.',
        tag: 'Kalender füllt sich · 24/7',
      },
    ],
  },
}

interface HowItWorksProps {
  lang?: Lang
}

export function HowItWorks({ lang = 'en' }: HowItWorksProps) {
  const lineRef = useRef<HTMLSpanElement>(null)
  const t = STRINGS[lang]

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const line = lineRef.current
    if (!line || reduced) return
    gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: scope.querySelector(`.${styles.steps}`),
          start: 'top 70%',
          end: 'bottom 75%',
          scrub: 0.6,
        },
      },
    )
  }, [])

  return (
    <section
      id="how"
      className="pad-y"
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className="wrap">
        <SectionHeader
          kicker={t.kicker}
          title={
            <>
              {t.titlePre} <span className="ghost-word">{t.titleGhost}</span> {t.titlePost}
            </>
          }
        />

        <div className={styles.steps}>
          <span className={styles.track} aria-hidden />
          <span ref={lineRef} className={styles.progress} aria-hidden />
          {t.steps.map((s) => (
            <article key={s.n} data-reveal className={styles.step}>
              <span className={styles.node} aria-hidden>
                {s.n}
              </span>
              <h3 className={styles.title}>{s.title}</h3>
              <p className={styles.body}>{s.body}</p>
              <span className={styles.tag}>{s.tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
