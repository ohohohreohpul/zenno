import type { Lang } from '@/lib/marketing/lang'
import { SectionHeader } from './primitives/SectionHeader'
import { CountUp } from './primitives/CountUp'
import styles from './BeforeAfter.module.css'

const STRINGS: Record<
  Lang,
  {
    kicker: string
    titlePre: string
    titleGhost: string
    beforeTag: string
    beforeTime: string
    beforeMsg: string
    beforeSilence: string
    afterTag: string
    afterTime: string
    afterMsg: string
    afterBooked: string
    roiLabel: string
    roiText: string
  }
> = {
  en: {
    kicker: 'The 11pm inquiry',
    titlePre: 'The message that used to go unanswered.',
    titleGhost: 'Now it books.',
    beforeTag: 'Before',
    beforeTime: '11:04 PM',
    beforeMsg: '“Hi, do you have any classes this weekend?”',
    beforeSilence: 'No reply. Seen tomorrow at 9am. Booked a competitor.',
    afterTag: 'After',
    afterTime: '11:04 PM · replied in 9 seconds',
    afterMsg: '“Yes! Weekend Workshop, Sat 10:00 with Mali — 8 spots left. Want one?”',
    afterBooked: 'Booked · Sat 10:00 — while you slept',
    roiLabel: 'recovered per month',
    roiText: 'chats/week × booking value — the inquiries that used to vanish overnight.',
  },
  de: {
    kicker: 'Die 23-Uhr-Anfrage',
    titlePre: 'Die Nachricht, die früher unbeantwortet blieb.',
    titleGhost: 'Jetzt bucht sie.',
    beforeTag: 'Vorher',
    beforeTime: '23:04 Uhr',
    beforeMsg: '„Hallo, gibt es dieses Wochenende noch Kurse?“',
    beforeSilence: 'Keine Antwort. Morgens um 9 Uhr gesehen. Bei der Konkurrenz gebucht.',
    afterTag: 'Nachher',
    afterTime: '23:04 Uhr · Antwort in 9 Sekunden',
    afterMsg: '„Ja! Wochenend-Workshop, Sa. 10:00 mit Mali — noch 8 Plätze frei. Soll ich reservieren?“',
    afterBooked: 'Gebucht · Sa. 10:00 — während Sie schliefen',
    roiLabel: 'zusätzlich pro Monat',
    roiText: 'Chats/Woche × Buchungswert — die Anfragen, die früher über Nacht verschwanden.',
  },
}

interface BeforeAfterProps {
  lang?: Lang
}

export function BeforeAfter({ lang = 'en' }: BeforeAfterProps) {
  const t = STRINGS[lang]

  return (
    <section className="pad-y">
      <div className="wrap">
        <SectionHeader
          kicker={t.kicker}
          title={
            <>
              {t.titlePre} <span className="ghost-word">{t.titleGhost}</span>
            </>
          }
        />

        <div className={styles.split}>
          <article data-reveal className={`${styles.side} ${styles.before}`}>
            <img src="/images/before-night.webp" alt="" className={styles.bgImg} loading="lazy" />
            <span className={styles.scrim} aria-hidden />
            <div className={styles.content}>
              <span className={styles.tag}>{t.beforeTag}</span>
              <p className={styles.time}>{t.beforeTime}</p>
              <p className={styles.msg}>{t.beforeMsg}</p>
              <div className={styles.silence}>
                <span className={styles.dots}>· · ·</span>
                <span>{t.beforeSilence}</span>
              </div>
            </div>
          </article>

          <article data-reveal className={`${styles.side} ${styles.after}`}>
            <img src="/images/after-morning.webp" alt="" className={styles.bgImg} loading="lazy" />
            <span className={styles.scrim} aria-hidden />
            <div className={styles.content}>
              <span className={styles.tag}>{t.afterTag}</span>
              <p className={styles.time}>{t.afterTime}</p>
              <p className={styles.msg}>{t.afterMsg}</p>
              <div className={styles.booked}>
                <span className="dot" /> {t.afterBooked}
              </div>
            </div>
          </article>
        </div>

        <div data-reveal className={styles.roi}>
          <div className={styles.roiNum}>
            ≈ €<CountUp to={2340} />
          </div>
          <div className={styles.roiText}>
            <strong>{t.roiLabel}</strong>
            <span>{t.roiText}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
