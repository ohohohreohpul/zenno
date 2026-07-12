'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { appHref } from '@/lib/marketing/config'
import { Magnetic } from './primitives/Magnetic'
import styles from './Nav.module.css'

const STRINGS: Record<Lang, { links: { label: string; hash: string }[]; signin: string; cta: string }> = {
  en: {
    links: [
      { label: 'How it works', hash: '#how' },
      { label: 'Features', hash: '#features' },
      { label: 'Channels', hash: '#channels' },
      { label: 'Pricing', hash: '#pricing' },
    ],
    signin: 'Sign in',
    cta: 'Get started free',
  },
  de: {
    links: [
      { label: 'So funktioniert’s', hash: '#how' },
      { label: 'Funktionen', hash: '#features' },
      { label: 'Kanäle', hash: '#channels' },
      { label: 'Preise', hash: '#pricing' },
    ],
    signin: 'Anmelden',
    cta: 'Kostenlos starten',
  },
}

interface NavProps {
  lang?: Lang
  /**
   * Set on pages that don't open with a dark photo hero (e.g. the pricing and
   * comparison deep-dive pages). Forces the ink-on-cream color scheme instead
   * of the white-on-photo scheme, which is otherwise invisible until scrolled.
   */
  onLightBg?: boolean
}

export function Nav({ lang = 'en', onLightBg = false }: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const t = STRINGS[lang]
  const home = lang === 'de' ? '/de' : '/'
  const switchTo = lang === 'de' ? { href: '/', label: 'EN' } : { href: '/de', label: 'DE' }
  const solid = scrolled || onLightBg

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.nav} ${solid ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href={`${home}#top`} className={styles.logo} aria-label="Zenno home">
          <span className={styles.mark} aria-hidden />
          zenno
        </a>

        <nav className={styles.links} aria-label="Primary">
          {t.links.map((l) => (
            <a key={l.hash} href={`${home}${l.hash}`} className={styles.link}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <a href={switchTo.href} className={styles.langSwitch} aria-label={`Switch language to ${switchTo.label}`}>
            {switchTo.label}
          </a>
          <a href={appHref()} className={styles.signin}>
            {t.signin}
          </a>
          <Magnetic strength={0.4}>
            <a href={appHref()} className="btn">
              {t.cta} <span className="arrow">→</span>
            </a>
          </Magnetic>
        </div>
      </div>
    </header>
  )
}
