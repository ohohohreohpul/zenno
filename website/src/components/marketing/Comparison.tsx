import type { Lang } from '@/lib/marketing/lang'
import { COMPARISON_ROWS } from '@/lib/marketing/content/comparison'
import { SectionHeader } from './primitives/SectionHeader'
import styles from './Comparison.module.css'

const STRINGS: Record<
  Lang,
  { kicker: string; titlePre: string; titleGhost: string; many: string; dm: string; zenno: string }
> = {
  en: {
    kicker: 'Where Zenno lands',
    titlePre: 'ManyChat automates. DMChamp answers.',
    titleGhost: 'Zenno fills the schedule.',
    many: 'ManyChat',
    dm: 'DMChamp',
    zenno: 'Zenno',
  },
  de: {
    kicker: 'Wo Zenno ansetzt',
    titlePre: 'ManyChat automatisiert. DMChamp antwortet.',
    titleGhost: 'Zenno füllt den Kalender.',
    many: 'ManyChat',
    dm: 'DMChamp',
    zenno: 'Zenno',
  },
}

function Cell({ on }: { on: boolean }) {
  return on ? (
    <span className={styles.yes} aria-label="yes">
      ✓
    </span>
  ) : (
    <span className={styles.no} aria-label="no">
      –
    </span>
  )
}

interface ComparisonProps {
  lang?: Lang
  rows?: number
}

export function Comparison({ lang = 'en', rows }: ComparisonProps) {
  const t = STRINGS[lang]
  const allRows = COMPARISON_ROWS[lang]
  const displayRows = rows ? allRows.slice(0, rows) : allRows.slice(0, 6)

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

        <div data-reveal className={`card ${styles.table}`}>
          <div className={`${styles.row} ${styles.header}`}>
            <span />
            <span>{t.many}</span>
            <span>{t.dm}</span>
            <span className={styles.zennoHead}>{t.zenno}</span>
          </div>
          {displayRows.map((r) => (
            <div key={r.label} className={styles.row}>
              <span className={styles.label}>{r.label}</span>
              <Cell on={r.many} />
              <Cell on={r.dm} />
              <span className={styles.zennoCell}>
                <Cell on={r.zenno} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
