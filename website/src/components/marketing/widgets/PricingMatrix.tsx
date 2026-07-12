import styles from './PricingMatrix.module.css'

type Cell = boolean | string

interface MatrixRow {
  label: string
  starter: Cell
  growth: Cell
  agency: Cell
}

const ROWS: MatrixRow[] = [
  { label: 'Channels included', starter: '1', growth: 'All', agency: 'All, per location' },
  { label: 'Monthly replies', starter: '500', growth: '2,500', agency: '2,500 per location' },
  { label: 'AI booking agent', starter: true, growth: true, agency: true },
  { label: 'Unified inbox', starter: true, growth: true, agency: true },
  { label: 'Warm-up protection', starter: true, growth: true, agency: true },
  { label: 'Lifecycle autopilot', starter: false, growth: true, agency: true },
  { label: 'AI broadcast', starter: false, growth: true, agency: true },
  { label: 'Guardrails & escalation', starter: false, growth: true, agency: true },
  { label: 'Daily summary digest', starter: false, growth: true, agency: true },
  { label: 'Multi-location support', starter: false, growth: false, agency: true },
  { label: 'White-label domains', starter: false, growth: false, agency: true },
  { label: 'Sub-account provisioning', starter: false, growth: false, agency: true },
  { label: 'Rollup dashboards', starter: false, growth: false, agency: true },
]

function CellValue({ value }: { value: Cell }) {
  if (typeof value === 'string') return <span className={styles.text}>{value}</span>
  return value ? (
    <span className={styles.yes} aria-label="included">
      ✓
    </span>
  ) : (
    <span className={styles.no} aria-label="not included">
      –
    </span>
  )
}

export function PricingMatrix() {
  return (
    <div data-reveal className={`card ${styles.table}`}>
      <div className={`${styles.row} ${styles.header}`}>
        <span />
        <span>Starter</span>
        <span>Growth</span>
        <span className={styles.agencyHead}>Agency</span>
      </div>
      {ROWS.map((r) => (
        <div key={r.label} className={styles.row}>
          <span className={styles.label}>{r.label}</span>
          <CellValue value={r.starter} />
          <CellValue value={r.growth} />
          <span className={styles.agencyCell}>
            <CellValue value={r.agency} />
          </span>
        </div>
      ))}
    </div>
  )
}
