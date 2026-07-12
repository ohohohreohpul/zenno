import type { ReactNode } from 'react'
import { SectionHeader } from './primitives/SectionHeader'
import styles from './PageHero.module.css'

interface PageHeroProps {
  kicker: string
  title: ReactNode
  lead?: ReactNode
}

/** Text-only page-top header for deep-dive pages that don't carry a photo hero. */
export function PageHero({ kicker, title, lead }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <SectionHeader align="center" kicker={kicker} title={title} lead={lead} />
      </div>
    </section>
  )
}
