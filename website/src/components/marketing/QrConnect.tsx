'use client'

import { useMemo, useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import styles from './QrConnect.module.css'

const STRINGS: Record<Lang, { title: string; waiting: string; ok: string }> = {
  en: {
    title: 'Your number. Your WhatsApp.',
    waiting: 'Waiting for scan…',
    ok: '● Connected as +49 176 •••',
  },
  de: {
    title: 'Ihre Nummer. Ihr WhatsApp.',
    waiting: 'Warte auf Scan…',
    ok: '● Verbunden als +49 176 •••',
  },
}

interface QrConnectProps {
  lang?: Lang
}

/** QR code that "scans" then morphs into a Connected confirmation. */
export function QrConnect({ lang = 'en' }: QrConnectProps) {
  const cells = useMemo(() => Array.from({ length: 36 }, (_, i) => (i * 7) % 3 === 0), [])
  const t = STRINGS[lang]
  const scanRef = useRef<HTMLSpanElement>(null)
  const doneRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<HTMLDivElement>(null)

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const scan = scanRef.current
    const done = doneRef.current
    const state = stateRef.current
    if (!scan || !done || !state) return

    const waiting = state.querySelector('[data-waiting]')
    const ok = state.querySelector('[data-ok]')
    gsap.set(done, { autoAlpha: 0, scale: 0.9 })
    gsap.set(ok, { autoAlpha: 0, y: 6 })

    if (reduced) {
      gsap.set(scan, { autoAlpha: 0 })
      gsap.set([done], { autoAlpha: 1, scale: 1 })
      gsap.set(waiting, { autoAlpha: 0 })
      gsap.set(ok, { autoAlpha: 1, y: 0 })
      return
    }

    const scanTween = gsap.to(scan, {
      top: '86%',
      duration: 1.1,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })

    const tl = gsap.timeline({
      scrollTrigger: { trigger: scope, start: 'top 75%', once: true },
    })
    tl.to({}, { duration: 2.4 })
      .add(() => scanTween.kill())
      .to(scan, { autoAlpha: 0, duration: 0.2 })
      .to(done, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' })
      .to(waiting, { autoAlpha: 0, y: -6, duration: 0.3 }, '<')
      .to(ok, { autoAlpha: 1, y: 0, duration: 0.35 }, '-=0.1')
  }, [])

  return (
    <div
      className={`card ${styles.card}`}
      ref={(n) => {
        scopeRef.current = n
      }}
    >
      <div className={styles.qrbox}>
        <div className={styles.grid} aria-hidden>
          {cells.map((on, i) => (
            <span key={i} className={on ? styles.off : ''} />
          ))}
        </div>
        <span ref={scanRef} className={styles.scan} aria-hidden />
        <div ref={doneRef} className={styles.done} aria-hidden>
          <span className={styles.check}>✓</span>
        </div>
      </div>
      <div ref={stateRef} className={styles.copy}>
        <strong>{t.title}</strong>
        <span data-waiting className={styles.waiting}>
          {t.waiting}
        </span>
        <span data-ok className={styles.ok}>
          {t.ok}
        </span>
      </div>
    </div>
  )
}
