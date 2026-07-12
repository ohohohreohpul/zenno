'use client'

import { useState } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import styles from './AiToggle.module.css'

const STRINGS: Record<
  Lang,
  {
    toggleLabel: string
    active: string
    paused: string
    hintActive: string
    hintPaused: string
    row1: string
    row2: string
  }
> = {
  en: {
    toggleLabel: 'Toggle AI',
    active: 'AI active',
    paused: 'Paused — you typed',
    hintActive: 'Answering, qualifying and booking automatically.',
    hintPaused: 'You’re driving this conversation. Hand back anytime.',
    row1: 'Refunds, complaints & medical questions auto-escalate',
    row2: 'One button hands the thread back to the agent',
  },
  de: {
    toggleLabel: 'KI umschalten',
    active: 'KI aktiv',
    paused: 'Pausiert — Sie haben getippt',
    hintActive: 'Antwortet, qualifiziert und bucht automatisch.',
    hintPaused: 'Sie führen dieses Gespräch. Jederzeit zurückgeben.',
    row1: 'Rückerstattungen, Beschwerden & medizinische Fragen eskalieren automatisch',
    row2: 'Ein Klick gibt den Thread an den Agenten zurück',
  },
}

interface AiToggleProps {
  lang?: Lang
}

/** Interactive AI active / paused control — the "human stays in charge" proof. */
export function AiToggle({ lang = 'en' }: AiToggleProps) {
  const [active, setActive] = useState(true)
  const t = STRINGS[lang]

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={t.toggleLabel}
        className={`${styles.toggle} ${active ? styles.on : ''}`}
        onClick={() => setActive((v) => !v)}
      >
        <span className={styles.knob} />
      </button>

      <div className={styles.state}>
        <strong className={active ? styles.green : styles.amber}>
          {active ? t.active : t.paused}
        </strong>
        <span className={styles.hint}>{active ? t.hintActive : t.hintPaused}</span>
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowDot} data-flag />
          {t.row1}
        </div>
        <div className={styles.row}>
          <span className={styles.rowDot} />
          {t.row2}
        </div>
      </div>
    </div>
  )
}
