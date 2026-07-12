import type { Lang } from '@/lib/marketing/lang'
import styles from './BroadcastPreview.module.css'

const STRINGS: Record<
  Lang,
  { segment: string; preview: string; rows: { name: string; preview: string; tag: string; sent?: boolean }[] }
> = {
  en: {
    segment: 'Segment: Lapsed 30d+',
    preview: 'Preview',
    rows: [
      { name: 'Mara L.', preview: 'Hi Mara — your trial spot is still open for...', tag: 'sent', sent: true },
      { name: 'Ines K.', preview: 'Hi Ines — miss you at Bloom! Here’s 15% off...', tag: 'queued' },
      { name: 'Deniz A.', preview: 'Hi Deniz — your usual Tuesday slot opened...', tag: 'queued' },
    ],
  },
  de: {
    segment: 'Segment: Inaktiv 30 Tage+',
    preview: 'Vorschau',
    rows: [
      { name: 'Mara L.', preview: 'Hallo Mara — dein Probetermin ist noch frei für...', tag: 'gesendet', sent: true },
      { name: 'Ines K.', preview: 'Hallo Ines — wir vermissen dich bei Bloom! 15%...', tag: 'geplant' },
      { name: 'Deniz A.', preview: 'Hallo Deniz — dein üblicher Dienstagstermin ist frei...', tag: 'geplant' },
    ],
  },
}

interface BroadcastPreviewProps {
  lang?: Lang
}

/** Static mini mockup: a personalized broadcast queue with a preview-before-send state. */
export function BroadcastPreview({ lang = 'en' }: BroadcastPreviewProps) {
  const t = STRINGS[lang]

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span>{t.segment}</span>
        <span className={styles.badge}>{t.preview}</span>
      </div>
      {t.rows.map((r) => (
        <div key={r.name} className={styles.row}>
          <span className={styles.avatar}>{r.name.charAt(0)}</span>
          <div className={styles.text}>
            <strong>{r.name}</strong>
            <span>{r.preview}</span>
          </div>
          <span className={`${styles.status} ${r.sent ? styles.sent : ''}`}>
            {r.tag}
          </span>
        </div>
      ))}
    </div>
  )
}
