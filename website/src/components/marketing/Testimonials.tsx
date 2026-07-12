import type { Lang } from '@/lib/marketing/lang'
import { SectionHeader } from './primitives/SectionHeader'
import styles from './Testimonials.module.css'

interface Quote {
  quote: string
  name: string
  role: string
  photo: string
}

const STRINGS: Record<
  Lang,
  { kicker: string; titlePre: string; titleGhost: string; disclaimer: string; quotes: Quote[] }
> = {
  en: {
    kicker: 'From the front desk',
    titlePre: 'Owners who stopped',
    titleGhost: 'answering at midnight.',
    disclaimer: 'Composite examples for layout — real studio quotes land after the first pilot.',
    quotes: [
      {
        quote:
          'It booked four trials the first night — while the studio was closed. I stopped checking my phone at midnight.',
        name: 'Mara L.',
        role: 'Owner · Lotus Yoga',
        photo: '/images/avatar-1.webp',
      },
      {
        quote:
          'Setup took the length of a coffee. Scanned the QR on my own number and it was answering in minutes.',
        name: 'Ines K.',
        role: 'Founder · Bloom Skin Studio',
        photo: '/images/avatar-2.webp',
      },
      {
        quote:
          'The warm-up thing sold me. I was terrified of a ban — Zenno just handles the limits so I don’t think about it.',
        name: 'Deniz A.',
        role: 'Manager · Still Point Spa',
        photo: '/images/avatar-3.webp',
      },
    ],
  },
  de: {
    kicker: 'Direkt vom Empfang',
    titlePre: 'Inhaber, die aufgehört haben,',
    titleGhost: 'um Mitternacht zu antworten.',
    disclaimer: 'Zusammengesetzte Beispiele für das Layout — echte Studio-Zitate folgen nach dem ersten Pilotbetrieb.',
    quotes: [
      {
        quote:
          'Er hat in der ersten Nacht vier Probestunden gebucht — während das Studio geschlossen war. Ich habe aufgehört, um Mitternacht aufs Handy zu schauen.',
        name: 'Mara L.',
        role: 'Inhaberin · Lotus Yoga',
        photo: '/images/avatar-1.webp',
      },
      {
        quote:
          'Die Einrichtung hat so lange gedauert wie ein Kaffee. QR-Code mit der eigenen Nummer gescannt, und es hat innerhalb von Minuten geantwortet.',
        name: 'Ines K.',
        role: 'Gründerin · Bloom Skin Studio',
        photo: '/images/avatar-2.webp',
      },
      {
        quote:
          'Der Aufwärmschutz hat mich überzeugt. Ich hatte Angst vor einer Sperre — Zenno kümmert sich einfach um die Limits, ich muss nicht mehr daran denken.',
        name: 'Deniz A.',
        role: 'Manager · Still Point Spa',
        photo: '/images/avatar-3.webp',
      },
    ],
  },
}

interface TestimonialsProps {
  lang?: Lang
}

export function Testimonials({ lang = 'en' }: TestimonialsProps) {
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
        <div className={styles.grid}>
          {t.quotes.map((q) => (
            <figure key={q.name} data-reveal className={`card ${styles.card}`}>
              <blockquote>{q.quote}</blockquote>
              <figcaption>
                <img
                  src={q.photo}
                  alt={lang === 'de' ? `Porträt von ${q.name}, ${q.role}` : `Portrait of ${q.name}, ${q.role}`}
                  className={styles.avatar}
                  loading="lazy"
                />
                <span>
                  <strong>{q.name}</strong>
                  <em>{q.role}</em>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.disclaimer}>{t.disclaimer}</p>
      </div>
    </section>
  )
}
