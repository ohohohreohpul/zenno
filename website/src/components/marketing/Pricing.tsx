'use client'

import type { Lang } from '@/lib/marketing/lang'
import { appHref } from '@/lib/marketing/config'
import { PRICING_TIERS } from '@/lib/marketing/content/pricing'
import { SectionHeader } from './primitives/SectionHeader'
import { Magnetic } from './primitives/Magnetic'
import styles from './Pricing.module.css'

const STRINGS: Record<Lang, { kicker: string; titlePre: string; titleGhost: string; lead: string; badge: string; per: string }> = {
  en: {
    kicker: 'Pricing',
    titlePre: 'Priced per booking season,',
    titleGhost: 'not per message.',
    lead: 'Start free. Upgrade when the calendar’s full.',
    badge: 'Most popular',
    per: '/mo',
  },
  de: {
    kicker: 'Preise',
    titlePre: 'Bezahlt nach Buchungssaison,',
    titleGhost: 'nicht nach Nachricht.',
    lead: 'Kostenlos starten. Upgrade, sobald der Kalender voll ist.',
    badge: 'Am beliebtesten',
    per: '/Monat',
  },
}

interface PricingProps {
  lang?: Lang
}

export function Pricing({ lang = 'en' }: PricingProps) {
  const t = STRINGS[lang]
  const tiers = PRICING_TIERS[lang]

  return (
    <section id="pricing" className="pad-y">
      <div className="wrap">
        <SectionHeader
          align="center"
          kicker={t.kicker}
          title={
            <>
              {t.titlePre} <span className="ghost-word">{t.titleGhost}</span>
            </>
          }
          lead={t.lead}
        />

        <div className={styles.grid}>
          {tiers.map((tier) => (
            <article
              key={tier.name}
              data-reveal
              className={`${styles.tier} ${tier.popular ? styles.popular : 'card'}`}
            >
              {tier.popular && <span className={styles.badge}>{t.badge}</span>}
              <span className={styles.name}>{tier.name}</span>
              <div className={styles.price}>
                <span className={styles.amount}>{tier.price}</span>
                <span className={styles.per}>{t.per}</span>
              </div>
              <span className={styles.line}>{tier.line}</span>
              <ul className={styles.features}>
                {tier.teaserFeatures.map((f) => (
                  <li key={f}>
                    <span className={styles.tick}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Magnetic strength={0.25}>
                <a
                  href={appHref()}
                  className={`btn ${tier.popular ? 'on-dark' : 'ghost'} ${styles.btn}`}
                >
                  {tier.cta} <span className="arrow">→</span>
                </a>
              </Magnetic>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
