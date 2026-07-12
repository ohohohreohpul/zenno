'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import { SectionHeader } from './primitives/SectionHeader'
import { QrConnect } from './QrConnect'
import styles from './Channels.module.css'

const CHANNELS: Record<Lang, { label: string; color: string; soon?: boolean }[]> = {
  en: [
    { label: 'WhatsApp', color: 'var(--wa)' },
    { label: 'Telegram', color: 'var(--tg)' },
    { label: 'LINE', color: 'var(--ln)' },
    { label: 'Messenger', color: 'var(--ms)' },
    { label: 'Web chat', color: 'var(--wc)' },
    { label: 'Instagram', color: 'var(--ig)', soon: true },
  ],
  de: [
    { label: 'WhatsApp', color: 'var(--wa)' },
    { label: 'Telegram', color: 'var(--tg)' },
    { label: 'LINE', color: 'var(--ln)' },
    { label: 'Messenger', color: 'var(--ms)' },
    { label: 'Webchat', color: 'var(--wc)' },
    { label: 'Instagram', color: 'var(--ig)', soon: true },
  ],
}

const STRINGS: Record<
  Lang,
  {
    kicker: string
    titlePre: string
    titleGhost: string
    lead: string
    soon: string
    methods: { title: string; body: string; tag: string }[]
  }
> = {
  en: {
    kicker: 'Their own number',
    titlePre: 'Every app your customers already use.',
    titleGhost: 'Connected in minutes.',
    lead: 'No BSP contracts, no Meta business verification, no rented phone numbers.',
    soon: 'soon',
    methods: [
      { title: 'WhatsApp', body: 'Scan a QR with your own phone — the linked-device method, like WhatsApp Web.', tag: 'QR · 60s' },
      { title: 'Telegram', body: 'Paste a bot token from BotFather. Connected in about a minute.', tag: 'Token · 60s' },
      { title: 'Web chat', body: 'Drop one <script> tag on any site. The agent answers visitors and books them.', tag: '1 line' },
    ],
  },
  de: {
    kicker: 'Die eigene Nummer',
    titlePre: 'Jede App, die Kunden bereits nutzen.',
    titleGhost: 'Verbunden in Minuten.',
    lead: 'Keine BSP-Verträge, keine Meta-Unternehmensverifizierung, keine gemieteten Telefonnummern.',
    soon: 'bald',
    methods: [
      { title: 'WhatsApp', body: 'QR-Code mit dem eigenen Handy scannen — die Linked-Device-Methode, wie bei WhatsApp Web.', tag: 'QR · 60 Sek.' },
      { title: 'Telegram', body: 'Bot-Token von BotFather einfügen. Verbunden in etwa einer Minute.', tag: 'Token · 60 Sek.' },
      { title: 'Webchat', body: 'Ein <script>-Tag auf jeder Website einfügen. Der Agent beantwortet Besucher und bucht sie.', tag: '1 Zeile' },
    ],
  },
}

interface ChannelsProps {
  lang?: Lang
}

export function Channels({ lang = 'en' }: ChannelsProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const t = STRINGS[lang]
  const channels = CHANNELS[lang]

  const scopeRef = useGsapContext(({ reduced }) => {
    const track = trackRef.current
    if (!track || reduced) return
    // seamless marquee (track holds two copies)
    gsap.to(track, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 })
  }, [])

  return (
    <section
      id="channels"
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
              {t.titlePre} <span className="ghost-word">{t.titleGhost}</span>
            </>
          }
          lead={t.lead}
        />
      </div>

      <div className={styles.marquee} aria-hidden>
        <div ref={trackRef} className={styles.track}>
          {[...channels, ...channels].map((c, i) => (
            <span key={i} className={styles.chip}>
              <span className={styles.chipDot} style={{ background: c.color }} />
              {c.label}
              {c.soon && <span className={styles.soon}>{t.soon}</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className={styles.grid}>
          <div className={styles.qrCol} data-reveal>
            <QrConnect lang={lang} />
          </div>
          <div className={styles.methods}>
            {t.methods.map((m) => (
              <article key={m.title} data-reveal className={`card ${styles.method}`}>
                <div className={styles.methodHead}>
                  <h3>{m.title}</h3>
                  <span className={styles.methodTag}>{m.tag}</span>
                </div>
                <p>{m.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
