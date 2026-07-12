import '@/styles/marketing.css'
import type { Metadata } from 'next'
import styles from './page.module.css'
import { COMPARISON_FAQ } from '@/lib/marketing/content/faq'
import { JsonLd } from '@/components/marketing/JsonLd'
import { faqPageSchema, breadcrumbSchema } from '@/lib/marketing/jsonld'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { Nav } from '@/components/marketing/Nav'
import { PageHero } from '@/components/marketing/PageHero'
import { Comparison } from '@/components/marketing/Comparison'
import { UseCaseFit } from '@/components/marketing/UseCaseFit'
import { SectionHeader } from '@/components/marketing/primitives/SectionHeader'
import { FaqAccordion } from '@/components/marketing/primitives/FaqAccordion'
import { ClosingCta } from '@/components/marketing/ClosingCta'
import { Footer } from '@/components/marketing/Footer'

export const metadata: Metadata = {
  title: 'Zenno vs. ManyChat vs. DMChamp — Full comparison',
  description:
    'ManyChat automates messages. DMChamp answers chats. See the full feature-by-feature comparison and why wellness businesses switch to Zenno to fill the schedule.',
  alternates: { canonical: '/comparison' },
}

export default function ComparisonPage() {
  return (
    <MarketingShell>
      <JsonLd data={faqPageSchema(COMPARISON_FAQ)} />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Comparison', path: '/comparison' }])} />
      <Nav onLightBg />
      <main>
        <PageHero
          kicker="The full comparison"
          title={
            <>
              ManyChat automates. DMChamp answers.{' '}
              <span className="ghost-word">Zenno fills the schedule.</span>
            </>
          }
          lead="Twelve capabilities, side by side — not just the three everyone leads with."
        />
        <div className="pad-y">
          <div className="wrap">
            <Comparison rows={12} />
          </div>
        </div>

        <UseCaseFit
          kicker="Why businesses switch"
          titlePre="The difference isn't features."
          titleGhost="It's the outcome they're built for."
          points={[
            {
              title: 'One system, not three',
              body: 'Booking, follow-up, and safety live in one agent — no stitching a chatbot builder to a separate calendar tool.',
            },
            {
              title: 'Built for appointments, not just messages',
              body: 'ManyChat and DMChamp were built for message volume. Zenno was built around one outcome: a confirmed booking.',
            },
            {
              title: 'Safety isn’t an afterthought',
              body: 'Warm-up protection and escalation guardrails are default behavior, not a manual workflow to build yourself.',
            },
          ]}
        />

        <section className="pad-y">
          <div className="wrap">
            <SectionHeader
              kicker="Switching, honestly"
              title={
                <>
                  What switching <span className="ghost-word">actually involves.</span>
                </>
              }
            />
            <div className={styles.faqWrap}>
              <FaqAccordion items={COMPARISON_FAQ} />
            </div>
          </div>
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </MarketingShell>
  )
}
