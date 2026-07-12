'use client'

import { useRef } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { appHref } from '@/lib/marketing/config'
import { useGsapContext, gsap } from '@/lib/marketing/gsap'
import { ChatAutoplay } from './ChatAutoplay'
import { Magnetic } from './primitives/Magnetic'
import styles from './Hero.module.css'

const CHANNELS = [
  { label: 'WhatsApp', color: 'var(--wa)', x: '8%', y: '14%' },
  { label: 'Telegram', color: 'var(--tg)', x: '40%', y: '9%' },
  { label: 'LINE', color: 'var(--ln)', x: '78%', y: '18%' },
]

const STRINGS: Record<
  Lang,
  {
    eyebrow: string
    line1: [string, string]
    line2: [string, string]
    lead: string
    ctaPrimary: string
    ctaSecondary: string
    note: string
  }
> = {
  en: {
    eyebrow: 'Answers 24/7 on their favourite app',
    line1: ['Your chats,', 'answered.'],
    line2: ['Your calendar,', 'filled.'],
    lead: "An AI receptionist that answers every message and books the appointment — on the business's own WhatsApp, Telegram, LINE, or website.",
    ctaPrimary: 'Get started free',
    ctaSecondary: 'See it book a class',
    note: 'No Meta verification · their own number · live in minutes',
  },
  de: {
    eyebrow: 'Antwortet rund um die Uhr auf dem Lieblingskanal',
    line1: ['Ihre Chats,', 'beantwortet.'],
    line2: ['Ihr Kalender,', 'gefüllt.'],
    lead: 'Ein KI-Empfang, der jede Nachricht beantwortet und den Termin bucht — auf dem eigenen WhatsApp, Telegram, LINE oder der eigenen Website des Betriebs.',
    ctaPrimary: 'Kostenlos starten',
    ctaSecondary: 'Live-Buchung ansehen',
    note: 'Keine Meta-Verifizierung · eigene Nummer · startklar in Minuten',
  },
}

interface HeroProps {
  lang?: Lang
}

export function Hero({ lang = 'en' }: HeroProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const proofRef = useRef<HTMLDivElement>(null)
  const t = STRINGS[lang]

  const scopeRef = useGsapContext(({ reduced, scope }) => {
    const lines = gsap.utils.toArray<HTMLElement>('[data-line-inner]')
    const fade = gsap.utils.toArray<HTMLElement>('[data-hero-fade]')
    const floats = gsap.utils.toArray<HTMLElement>('[data-float]')
    const img = imgRef.current
    const proof = proofRef.current

    if (reduced) {
      gsap.set([...lines, ...fade, ...floats], { yPercent: 0, y: 0, opacity: 1, scale: 1 })
      return
    }

    gsap.set(lines, { yPercent: 112 })
    gsap.set(fade, { opacity: 0, y: 16 })
    gsap.set(floats, { opacity: 0, scale: 0.85, y: 8 })
    if (proof) gsap.set(proof, { opacity: 0, y: 34, scale: 0.97 })
    if (img) gsap.set(img, { scale: 1.14 })

    const tl = gsap.timeline({ delay: 0.1, defaults: { ease: 'expo.out' } })
    tl.to(img, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .to(lines, { yPercent: 0, duration: 1.05, stagger: 0.09 }, 0.15)
      .to(fade, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, '-=0.6')
      .to(proof, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'expo.out' }, '-=0.55')
      .to(floats, { opacity: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.5')

    floats.forEach((f, i) => {
      gsap.to(f, {
        y: '+=8',
        duration: 2.6 + i * 0.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.2 + i * 0.2,
      })
    })

    // slow cinematic drift on the background as the hero scrolls away
    if (img) {
      gsap.to(img, {
        yPercent: 6,
        scale: 1.06,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true },
      })
    }
    if (proof) {
      gsap.to(proof, {
        yPercent: -14,
        ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom top', scrub: true },
      })
    }
  }, [])

  return (
    <section
      id="top"
      ref={(n) => {
        scopeRef.current = n
      }}
      className={styles.hero}
    >
      <div className={styles.media}>
        <img
          ref={imgRef}
          src="/images/hero.webp"
          alt=""
          className={styles.img}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className={styles.scrim} aria-hidden />
      <div className={styles.scrimBottom} aria-hidden />
      <div className={styles.fadeToPage} aria-hidden />

      {CHANNELS.map((c) => (
        <span
          key={c.label}
          data-float
          className={styles.chip}
          style={{ left: c.x, top: c.y }}
        >
          <span className={styles.chipDot} style={{ background: c.color }} />
          {c.label}
        </span>
      ))}

      <div className={`wrap-wide ${styles.content}`}>
        <div className={styles.copy}>
          <span data-hero-fade className={styles.eyebrow}>
            <span className="dot" /> {t.eyebrow}
          </span>

          <h1 className={styles.headline}>
            <span className={styles.lineMask}>
              <span data-line-inner className={styles.lineInner}>
                {t.line1[0]} <span className={styles.ghost}>{t.line1[1]}</span>
              </span>
            </span>
            <span className={styles.lineMask}>
              <span data-line-inner className={styles.lineInner}>
                {t.line2[0]} <span className={styles.ghost}>{t.line2[1]}</span>
              </span>
            </span>
          </h1>

          <p data-hero-fade className={styles.lead}>
            {t.lead}
          </p>

          <div data-hero-fade className={styles.ctas}>
            <Magnetic strength={0.4}>
              <a href={appHref()} className="btn on-dark">
                {t.ctaPrimary} <span className="arrow">→</span>
              </a>
            </Magnetic>
            <a href="#demo" className={`btn ${styles.ghostOnPhoto}`}>
              {t.ctaSecondary}
            </a>
          </div>

          <p data-hero-fade className={styles.note}>
            {t.note}
          </p>
        </div>
      </div>

      <div
        ref={proofRef}
        className={styles.proof}
      >
        <ChatAutoplay lang={lang} />
      </div>
    </section>
  )
}
