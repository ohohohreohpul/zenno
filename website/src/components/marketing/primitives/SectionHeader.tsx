import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  kicker: string
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
}

export function SectionHeader({ kicker, title, lead, align = 'left' }: SectionHeaderProps) {
  return (
    <div className={`${styles.head} ${align === 'center' ? styles.center : ''}`}>
      <span data-reveal className="kicker">
        {kicker}
      </span>
      <h2 data-reveal className="title">
        {title}
      </h2>
      {lead && (
        <p data-reveal className={`lead ${styles.lead}`}>
          {lead}
        </p>
      )}
    </div>
  )
}
