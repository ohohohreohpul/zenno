import type { Lang } from '@/lib/marketing/lang'
import { MarketingShell } from './MarketingShell'
import { Nav } from './Nav'
import { Hero } from './Hero'
import { LogoStrip } from './LogoStrip'
import { StatBand } from './StatBand'
import { HowItWorks } from './HowItWorks'
import { FeatureBento } from './FeatureBento'
import { Channels } from './Channels'
import { UspSplits } from './UspSplits'
import { ProductPreview } from './ProductPreview'
import { BeforeAfter } from './BeforeAfter'
import { Testimonials } from './Testimonials'
import { Pricing } from './Pricing'
import { Comparison } from './Comparison'
import { Faq } from './Faq'
import { ClosingCta } from './ClosingCta'
import { Footer } from './Footer'

interface HomePageProps {
  lang: Lang
}

/** Shared homepage assembly rendered by both app/page.tsx (en) and app/de/page.tsx. */
export function HomePage({ lang }: HomePageProps) {
  return (
    <MarketingShell lang={lang}>
      <Nav lang={lang} />
      <main>
        <Hero lang={lang} />
        <LogoStrip lang={lang} />
        <StatBand lang={lang} />
        <HowItWorks lang={lang} />
        <FeatureBento lang={lang} />
        <Channels lang={lang} />
        <UspSplits lang={lang} />
        <ProductPreview lang={lang} />
        <BeforeAfter lang={lang} />
        <Testimonials lang={lang} />
        <Pricing lang={lang} />
        <Comparison lang={lang} />
        <Faq lang={lang} />
        <ClosingCta lang={lang} />
      </main>
      <Footer lang={lang} />
    </MarketingShell>
  )
}
