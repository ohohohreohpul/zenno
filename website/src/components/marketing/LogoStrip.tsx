import type { Lang } from '@/lib/marketing/lang'
import styles from './LogoStrip.module.css'

const STUDIOS = [
  { name: 'Lotus Yoga', glyph: '﹥' },
  { name: 'Bloom Skin Studio', glyph: '✦' },
  { name: 'Still Point Spa', glyph: '◐' },
  { name: 'Marrow & Co.', glyph: '✕' },
  { name: 'North Clinic', glyph: '△' },
  { name: 'Ember Wellness', glyph: '◆' },
]

const STRINGS: Record<Lang, string> = {
  en: 'Trusted by wellness & beauty studios already filling their calendar',
  de: 'Vertraut von Wellness- und Beauty-Studios, die ihren Kalender bereits füllen',
}

interface LogoStripProps {
  lang?: Lang
}

export function LogoStrip({ lang = 'en' }: LogoStripProps) {
  return (
    <section className={styles.section}>
      <div className={`wrap ${styles.inner}`}>
        <span data-reveal className={styles.label}>
          {STRINGS[lang]}
        </span>
        <ul className={styles.row}>
          {STUDIOS.map((s) => (
            <li key={s.name} data-reveal className={styles.logo}>
              <span className={styles.glyph} aria-hidden>
                {s.glyph}
              </span>
              {s.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
