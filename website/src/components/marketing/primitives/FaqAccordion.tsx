'use client'

import { useState } from 'react'
import styles from './FaqAccordion.module.css'

export interface FaqItem {
  q: string
  a: string
}

interface FaqAccordionProps {
  items: FaqItem[]
  defaultOpen?: number
}

/** Reusable single-open accordion — shared by the homepage FAQ, pricing, and comparison pages. */
export function FaqAccordion({ items, defaultOpen = 0 }: FaqAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={styles.list}>
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className={`${styles.item} ${isOpen ? styles.open : ''}`}>
            <button
              className={styles.q}
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {item.q}
              <span className={styles.sign} aria-hidden>
                ＋
              </span>
            </button>
            <div className={styles.body}>
              <div className={styles.inner}>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
