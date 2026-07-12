import type { ChatScript } from './ChatAutoplay'
import { JsonLd } from './JsonLd'
import { breadcrumbSchema } from '@/lib/marketing/jsonld'
import { MarketingShell } from './MarketingShell'
import { Nav } from './Nav'
import { UseCaseHero } from './UseCaseHero'
import { StatBand } from './StatBand'
import { UseCaseFit } from './UseCaseFit'
import { FeatureBento } from './FeatureBento'
import { Testimonials } from './Testimonials'
import { Pricing } from './Pricing'
import { Faq } from './Faq'
import { ClosingCta } from './ClosingCta'
import { Footer } from './Footer'

export interface UseCaseConfig {
  breadcrumb: { name: string; path: string }
  heroImage: string
  hero: {
    kicker: string
    titlePre: string
    titleGhost: string
    lead: string
    ctaPrimary: string
    ctaSecondary: string
  }
  chatScript: ChatScript
  fit: {
    kicker: string
    titlePre: string
    titleGhost: string
    points: { title: string; body: string }[]
  }
}

/** Shared template for the vertical landing pages (yoga studios, salons & spas, clinics). */
export function UseCasePage({ config }: { config: UseCaseConfig }) {
  return (
    <MarketingShell>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, config.breadcrumb])} />
      <Nav />
      <main>
        <UseCaseHero image={config.heroImage} chatScript={config.chatScript} {...config.hero} />
        <StatBand />
        <UseCaseFit {...config.fit} />
        <FeatureBento />
        <Testimonials />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </MarketingShell>
  )
}
