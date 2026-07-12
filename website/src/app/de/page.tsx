import '@/styles/marketing.css'
import type { Metadata } from 'next'
import { HomePage } from '@/components/marketing/HomePage'
import { JsonLd } from '@/components/marketing/JsonLd'
import { softwareApplicationSchema, faqPageSchema } from '@/lib/marketing/jsonld'
import { HOMEPAGE_FAQ } from '@/lib/marketing/content/faq'

export const metadata: Metadata = {
  title: 'Zenno — Ihre Chats, beantwortet. Ihr Kalender, gefüllt.',
  description:
    'Ein KI-Empfang, der jede Nachricht beantwortet und Termine rund um die Uhr bucht — auf dem eigenen WhatsApp, Telegram, LINE, Messenger oder der eigenen Website.',
  alternates: {
    canonical: '/de',
    languages: { en: '/', de: '/de', 'x-default': '/' },
  },
}

export default function LandingPageDe() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema('de')} />
      <JsonLd data={faqPageSchema(HOMEPAGE_FAQ.de)} />
      <HomePage lang="de" />
    </>
  )
}
