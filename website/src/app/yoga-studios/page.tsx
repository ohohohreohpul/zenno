import '@/styles/marketing.css'
import type { Metadata } from 'next'
import { UseCasePage, type UseCaseConfig } from '@/components/marketing/UseCasePage'

export const metadata: Metadata = {
  title: 'Zenno for Yoga Studios — Every mat, always booked',
  description:
    'An AI receptionist for yoga studios that answers class questions and books the mat 24/7 — on your own WhatsApp, Telegram, or website.',
  alternates: { canonical: '/yoga-studios' },
}

const config: UseCaseConfig = {
  breadcrumb: { name: 'Yoga Studios', path: '/yoga-studios' },
  heroImage: '/images/yoga-hero.webp',
  hero: {
    kicker: 'Built for yoga studios',
    titlePre: 'Your mat count,',
    titleGhost: 'your booking rate.',
    lead: "Class schedules change every week. Zenno answers “is there a spot in tonight's flow?” the moment it's asked — and books the mat.",
    ctaPrimary: 'Get started free',
    ctaSecondary: 'See it book a class',
  },
  chatScript: {
    studio: 'Lotus Yoga',
    channel: 'WhatsApp · online',
    turns: [
      { from: 'me', text: 'Any free yoga slots this Saturday?' },
      { from: 'bot', text: 'Yes — Weekend Workshop, Sat 10:00 with Mali. 8 spots left. Want one?' },
      { from: 'me', text: 'Book me in 🙌' },
      { from: 'bot', text: "You're in. See you Saturday!", booked: true },
    ],
    bookedLabel: 'Booked · Sat 10:00',
  },
  fit: {
    kicker: 'Why studios switch',
    titlePre: 'Built around the way a studio',
    titleGhost: 'actually fills a mat.',
    points: [
      {
        title: 'Class schedules change weekly',
        body: 'Point Zenno at your booking software or class calendar; it always quotes the real, current schedule — never a stale spot count.',
      },
      {
        title: 'Drop-ins book in seconds',
        body: "A first-timer asking about tonight's flow gets a real answer and a real booking, not a “we'll get back to you.”",
      },
      {
        title: 'No-shows get re-engaged',
        body: "A missed class doesn't end the relationship — lifecycle campaigns follow up automatically to get them back on the mat.",
      },
    ],
  },
}

export default function YogaStudiosPage() {
  return <UseCasePage config={config} />
}
