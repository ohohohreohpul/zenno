import '@/styles/marketing.css'
import type { Metadata } from 'next'
import { HomePage } from '@/components/marketing/HomePage'
import { JsonLd } from '@/components/marketing/JsonLd'
import { softwareApplicationSchema, faqPageSchema } from '@/lib/marketing/jsonld'
import { HOMEPAGE_FAQ } from '@/lib/marketing/content/faq'

export const metadata: Metadata = {
  title: 'Zenno — Your chats, answered. Your calendar, filled.',
  description:
    "An AI receptionist that answers every message and books appointments 24/7 — on the business's own WhatsApp, Telegram, LINE, Messenger, or website.",
  alternates: {
    canonical: '/',
    languages: { en: '/', de: '/de', 'x-default': '/' },
  },
}

export default function LandingPage() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema('en')} />
      <JsonLd data={faqPageSchema(HOMEPAGE_FAQ.en)} />
      <HomePage lang="en" />
    </>
  )
}
