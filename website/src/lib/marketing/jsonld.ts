import type { Lang } from './lang'
import type { FaqItem } from './content/faq'
import { PRICING_TIERS } from './content/pricing'
import { SITE_URL } from './config'

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Zenno',
    url: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
    description:
      "An AI receptionist that answers customer chats and books appointments 24/7 on a business's own WhatsApp, Telegram, LINE, Messenger, or website.",
  }
}

export function softwareApplicationSchema(lang: Lang) {
  const tiers = PRICING_TIERS[lang]
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Zenno',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: lang === 'de' ? `${SITE_URL}/de` : SITE_URL,
    description:
      lang === 'de'
        ? 'Ein KI-Empfang, der jede Nachricht beantwortet und Termine rund um die Uhr bucht.'
        : 'An AI receptionist that answers every message and books appointments 24/7.',
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: tier.price.replace(/[^0-9.]/g, ''),
      priceCurrency: 'EUR',
      description: tier.line,
    })),
  }
}

export function faqPageSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}
