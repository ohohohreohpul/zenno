import '@/styles/marketing.css'
import type { Metadata } from 'next'
import styles from './page.module.css'
import { PRICING_FAQ } from '@/lib/marketing/content/faq'
import { JsonLd } from '@/components/marketing/JsonLd'
import { faqPageSchema, breadcrumbSchema } from '@/lib/marketing/jsonld'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { Nav } from '@/components/marketing/Nav'
import { PageHero } from '@/components/marketing/PageHero'
import { Pricing } from '@/components/marketing/Pricing'
import { PricingMatrix } from '@/components/marketing/widgets/PricingMatrix'
import { SectionHeader } from '@/components/marketing/primitives/SectionHeader'
import { FaqAccordion } from '@/components/marketing/primitives/FaqAccordion'
import { ClosingCta } from '@/components/marketing/ClosingCta'
import { Footer } from '@/components/marketing/Footer'

export const metadata: Metadata = {
  title: 'Zenno Pricing — Priced per booking season, not per message',
  description:
    'Zenno pricing plans: Starter €99, Growth €249, Agency €499 per month. Every plan includes the AI booking agent, unified inbox, and warm-up protection.',
  alternates: { canonical: '/pricing' },
}

export default function PricingPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqPageSchema(PRICING_FAQ)} />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }])} />
      <Nav onLightBg />
      <main>
        <PageHero
          kicker="Full pricing breakdown"
          title={
            <>
              Every plan, <span className="ghost-word">every feature.</span>
            </>
          }
          lead="Compare Starter, Growth, and Agency feature by feature — not just the headline price."
        />
        <div className="pad-y">
          <Pricing />
        </div>
        <section className="pad-y">
          <div className="wrap">
            <SectionHeader
              kicker="Feature by feature"
              title={
                <>
                  What&rsquo;s actually <span className="ghost-word">in each plan.</span>
                </>
              }
            />
            <div className={styles.matrixWrap}>
              <PricingMatrix />
            </div>
          </div>
        </section>
        <section className="pad-y">
          <div className="wrap">
            <SectionHeader
              kicker="Billing questions"
              title={
                <>
                  Straight answers <span className="ghost-word">about the invoice.</span>
                </>
              }
            />
            <div className={styles.faqWrap}>
              <FaqAccordion items={PRICING_FAQ} />
            </div>
          </div>
        </section>
        <ClosingCta />
      </main>
      <Footer />
    </MarketingShell>
  )
}
