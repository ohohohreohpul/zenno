'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { useGsapContext, gsap, ScrollTrigger } from '@/lib/marketing/gsap'
import styles from './ChatAutoplay.module.css'

type Turn = { from: 'me' | 'bot'; text: string; booked?: boolean }
export type ChatScript = { studio: string; channel: string; turns: Turn[]; bookedLabel: string }

const SCRIPTS: Record<Lang, ChatScript> = {
  en: {
    studio: 'Lotus Yoga',
    channel: 'WhatsApp · online',
    turns: [
      { from: 'me', text: 'Any free yoga slots this Saturday?' },
      { from: 'bot', text: 'Yes — Weekend Workshop, Sat 10:00 with Mali. 8 spots left. Want one?' },
      { from: 'me', text: 'Book me in 🙌' },
      { from: 'bot', text: "You're in. See you Saturday!", booked: true },
    ],
    bookedLabel: 'Booked · Sat 10:00',
  },
  de: {
    studio: 'Lotus Yoga',
    channel: 'WhatsApp · online',
    turns: [
      { from: 'me', text: 'Gibt es am Samstag noch freie Yoga-Plätze?' },
      { from: 'bot', text: 'Ja — Wochenend-Workshop, Sa. 10:00 Uhr mit Mali. Noch 8 Plätze frei. Soll ich reservieren?' },
      { from: 'me', text: 'Ja, bitte buchen 🙌' },
      { from: 'bot', text: 'Fertig! Bis Samstag!', booked: true },
    ],
    bookedLabel: 'Gebucht · Sa. 10:00',
  },
}

interface ChatAutoplayProps {
  lang?: Lang
  /** Overrides the default script — used by the vertical landing pages. */
  script?: ChatScript
}

/**
 * The proof component: a customer asks, the agent offers a real slot and books it.
 * Loops while on screen, pauses when scrolled away, respects reduced motion.
 */
export function ChatAutoplay({ lang = 'en', script: scriptOverride }: ChatAutoplayProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const script = scriptOverride ?? SCRIPTS[lang]

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const bubbles = gsap.utils.toArray<HTMLElement>('[data-bubble]')
    const typing = scope.querySelector<HTMLElement>('[data-typing]')
    const booked = scope.querySelector<HTMLElement>('[data-booked]')
    if (!typing || !booked) return

    gsap.set(bubbles, { opacity: 0, y: 12, scale: 0.97 })
    gsap.set(typing, { autoAlpha: 0 })
    gsap.set(booked, { opacity: 0, scale: 0.8 })

    if (reduced) {
      gsap.set(bubbles, { opacity: 1, y: 0, scale: 1 })
      gsap.set(booked, { opacity: 1, scale: 1 })
      return
    }

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.4, paused: true })

    bubbles.forEach((b, i) => {
      const incoming = b.dataset.from === 'bot'
      if (incoming) {
        tl.to(typing, { autoAlpha: 1, duration: 0.2 }, i === 0 ? 0 : '+=0.35')
          .to({}, { duration: 0.9 })
          .to(typing, { autoAlpha: 0, duration: 0.15 })
      }
      tl.to(
        b,
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'expo.out' },
        incoming ? '>' : i === 0 ? 0.3 : '+=0.5',
      )
      if (b.dataset.booked) {
        tl.to(booked, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, '+=0.15')
      }
    })
    // reset for the loop
    tl.to({}, { duration: 0.01 })
    tl.set(bubbles, { opacity: 0, y: 12, scale: 0.97 }, '+=2.4')
    tl.set(booked, { opacity: 0, scale: 0.8 }, '<')

    ScrollTrigger.create({
      trigger: scope,
      start: 'top 90%',
      end: 'bottom 10%',
      onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
    })
  }, [])

  return (
    <div
      ref={(n) => {
        scopeRef.current = n
      }}
      className={`card ${styles.chat}`}
      aria-label="Live demo: the agent books a customer"
    >
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden>
          <span className={styles.chDot} />
        </span>
        <div>
          <strong>{script.studio}</strong>
          <span className={styles.chan}>{script.channel}</span>
        </div>
      </div>

      <div className={styles.body} ref={listRef}>
        {script.turns.map((turn, i) => (
          <div
            key={i}
            data-bubble
            data-from={turn.from}
            data-booked={turn.booked ? '1' : undefined}
            className={`${styles.bubble} ${turn.from === 'me' ? styles.me : styles.bot}`}
          >
            {turn.text}
            {turn.booked && (
              <span data-booked className={styles.booked}>
                <span className={styles.bookDot} /> {script.bookedLabel}
              </span>
            )}
          </div>
        ))}
        <div data-typing className={`${styles.bubble} ${styles.bot} ${styles.typing}`}>
          <i /> <i /> <i />
        </div>
      </div>
    </div>
  )
}
