import '@/styles/marketing.css'
import type { Metadata } from 'next'
import { UseCasePage, type UseCaseConfig } from '@/components/marketing/UseCasePage'

export const metadata: Metadata = {
  title: 'Zenno for Clinics — Consultations booked, not missed',
  description:
    'An AI receptionist for wellness clinics that answers scheduling questions and books consultations 24/7 — while flagging medical questions to a human.',
  alternates: { canonical: '/clinics' },
}

const config: UseCaseConfig = {
  breadcrumb: { name: 'Clinics', path: '/clinics' },
  heroImage: '/images/clinic-hero.webp',
  hero: {
    kicker: 'Built for clinics',
    titlePre: 'Consultations,',
    titleGhost: 'booked, not missed.',
    lead: 'Patients ask about availability at all hours. Zenno answers instantly, qualifies the request, and books the consultation — while flagging anything medical to a human.',
    ctaPrimary: 'Get started free',
    ctaSecondary: 'See it book a class',
  },
  chatScript: {
    studio: 'North Clinic',
    channel: 'WhatsApp · online',
    turns: [
      { from: 'me', text: 'Can I book a consultation this week?' },
      { from: 'bot', text: 'Yes — Tuesday 9:30am or Wednesday 3:00pm are open. Which suits you?' },
      { from: 'me', text: 'Wednesday works' },
      { from: 'bot', text: 'Confirmed for Wednesday 3:00pm. See you then!', booked: true },
    ],
    bookedLabel: 'Booked · Wed 3:00pm',
  },
  fit: {
    kicker: 'Why clinics switch',
    titlePre: 'Built around the way a clinic',
    titleGhost: 'actually books a visit.',
    points: [
      {
        title: 'Medical questions escalate, never guessed on',
        body: 'Anything clinical automatically flags for a human — the agent handles scheduling, never diagnosis.',
      },
      {
        title: 'Consultations booked, not just inquired about',
        body: 'Patients get a confirmed slot in seconds, any hour — no phone tag with the front desk.',
      },
      {
        title: 'Privacy-first by design',
        body: 'The agent sticks to scheduling and general information; sensitive topics always route to your team.',
      },
    ],
  },
}

export default function ClinicsPage() {
  return <UseCasePage config={config} />
}
