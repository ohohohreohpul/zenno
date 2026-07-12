import '@/styles/marketing.css'
import type { Metadata } from 'next'
import { UseCasePage, type UseCaseConfig } from '@/components/marketing/UseCasePage'

export const metadata: Metadata = {
  title: 'Zenno for Salons & Spas — Every chair, always booked',
  description:
    'An AI receptionist for salons and spas that answers booking questions and fills the chair 24/7 — on your own WhatsApp, Telegram, or website.',
  alternates: { canonical: '/salons-spas' },
}

const config: UseCaseConfig = {
  breadcrumb: { name: 'Salons & Spas', path: '/salons-spas' },
  heroImage: '/images/salon-hero.webp',
  hero: {
    kicker: 'Built for salons & spas',
    titlePre: 'Every chair,',
    titleGhost: 'always booked.',
    lead: 'Clients want a haircut or facial appointment right now, not a callback tomorrow. Zenno checks the real chair availability and books it on the spot.',
    ctaPrimary: 'Get started free',
    ctaSecondary: 'See it book a class',
  },
  chatScript: {
    studio: 'Bloom Skin Studio',
    channel: 'WhatsApp · online',
    turns: [
      { from: 'me', text: 'Do you have any facial appointments open this week?' },
      { from: 'bot', text: 'Yes — Thursday 2:00pm or Friday 11:00am with Ines. Which works?' },
      { from: 'me', text: 'Thursday please!' },
      { from: 'bot', text: "You're booked for Thursday 2:00pm. See you then!", booked: true },
    ],
    bookedLabel: 'Booked · Thu 2:00pm',
  },
  fit: {
    kicker: 'Why salons switch',
    titlePre: 'Built around the way a salon',
    titleGhost: 'actually fills a chair.',
    points: [
      {
        title: 'Walk-in questions become bookings',
        body: '“Do you have anything today?” gets answered with a real slot and a real name on the calendar, not silence.',
      },
      {
        title: 'Upsell without the awkward ask',
        body: 'The agent mentions add-ons and packages naturally, within the guardrails the owner sets.',
      },
      {
        title: 'Repeat clients rebook automatically',
        body: 'A completed appointment triggers a rebooking nudge at just the right interval — no spreadsheet reminders.',
      },
    ],
  },
}

export default function SalonsSpasPage() {
  return <UseCasePage config={config} />
}
