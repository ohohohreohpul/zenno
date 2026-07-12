'use client'

import type { ReactNode } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { SectionHeader } from './primitives/SectionHeader'
import { MiniCalendar } from './widgets/MiniCalendar'
import { BroadcastPreview } from './widgets/BroadcastPreview'
import styles from './FeatureBento.module.css'

type Feature = {
  title: string
  body: string
  tag?: string
  widget?: ReactNode
  area: string
  glyph: ReactNode
}

const Glyph = {
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 12h5l1.5 3h5L21 12" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="5" width="18" height="14" rx="3" />
    </svg>
  ),
  booking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M8.5 14.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  autopilot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  broadcast: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 10v4l11 5V5L4 10z" strokeLinejoin="round" />
      <path d="M18 9a4 4 0 0 1 0 6" strokeLinecap="round" />
    </svg>
  ),
  handoff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="8" r="3" />
      <path d="M3 20a5 5 0 0 1 10 0" strokeLinecap="round" />
      <path d="M15 7h5m0 0-2-2m2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

interface Strings {
  kicker: string
  titlePre: string
  titleGhost: string
  lead: string
  features: Feature[]
}

// Explicit bento layout (see .grid grid-template-areas): each area is a named,
// hand-placed rectangle — auto-placement left the tall cell spanning two rows
// it didn't share with anything else, ballooning it with dead space.
function buildStrings(lang: Lang): Strings {
  if (lang === 'de') {
    return {
      kicker: 'Alles, was der Agent übernimmt',
      titlePre: 'Ein Empfang.',
      titleGhost: 'Der ganze Front Desk.',
      lead: 'Gewinnen, betreiben, wachsen, absichern — jede Fähigkeit zahlt auf eine Buchung ein.',
      features: [
        { title: 'Echte Buchungen', body: 'Der Agent prüft den Live-Kalender, bietet freie Termine mit echter Verfügbarkeit an und trägt direkt in den Kalender ein.', widget: <MiniCalendar lang="de" />, area: 'bookings', glyph: Glyph.booking },
        { title: 'KI-Broadcast', body: 'Segmentierte Kampagnen, pro Kontakt personalisiert, mit Vorschau vor jedem Versand.', widget: <BroadcastPreview lang="de" />, area: 'broadcast', glyph: Glyph.broadcast },
        { title: 'Zentraler Posteingang', body: 'Jeder Kanal in einem Thread. Filter nach Offen, Ungelesen, KI pausiert oder Aufmerksamkeit nötig.', tag: 'Alle · Achtung', area: 'inbox', glyph: Glyph.inbox },
        { title: 'Übergabe an Menschen', body: 'Sobald selbst getippt wird, pausiert die KI für diesen Kontakt. Mit einem Klick zurückgeben.', tag: 'Pausiert', area: 'handoff', glyph: Glyph.handoff },
        { title: 'Aufwärm-Schutz', body: 'Neue Nummern erhalten automatischen Schutz — Tageslimits starten bei 20 und wachsen mit dem Alter der Nummer.', tag: '20 → 200 / Tag', area: 'warmup', glyph: Glyph.shield },
        { title: 'Lifecycle-Autopilot', body: 'Eine Buchung verschiebt die Phase des Kontakts, und der Phasenwechsel löst die passende Folgekampagne aus.', tag: 'Probe → wahrgenommen', area: 'lifecycle', glyph: Glyph.autopilot },
      ],
    }
  }
  return {
    kicker: 'Everything the agent does',
    titlePre: 'One receptionist.',
    titleGhost: 'The whole front desk.',
    lead: 'Capture, operate, grow, and stay safe — every capability points back at a booking.',
    features: [
      { title: 'Real bookings', body: 'The agent checks your live schedule, offers open slots with real availability, and books straight into the calendar.', widget: <MiniCalendar lang="en" />, area: 'bookings', glyph: Glyph.booking },
      { title: 'AI broadcast', body: 'Segment-targeted campaigns, personalised per contact, with a preview before anything sends.', widget: <BroadcastPreview lang="en" />, area: 'broadcast', glyph: Glyph.broadcast },
      { title: 'Unified inbox', body: 'Every channel in one thread. Filter by Open, Unread, AI Paused, or Attention Required.', tag: 'All · Attention', area: 'inbox', glyph: Glyph.inbox },
      { title: 'Human handoff', body: 'The moment you type, the AI pauses for that contact. Hand back with one button.', tag: 'Paused', area: 'handoff', glyph: Glyph.handoff },
      { title: 'Warm-up shield', body: 'Fresh numbers get automatic protection — daily caps start at 20 and grow with number age.', tag: '20 → 200 / day', area: 'warmup', glyph: Glyph.shield },
      { title: 'Lifecycle autopilot', body: 'A booking moves the contact’s stage, and the stage change fires the right follow-up campaign.', tag: 'trial → attended', area: 'lifecycle', glyph: Glyph.autopilot },
    ],
  }
}

interface FeatureBentoProps {
  lang?: Lang
}

export function FeatureBento({ lang = 'en' }: FeatureBentoProps) {
  const t = buildStrings(lang)

  return (
    <section id="features" className="pad-y">
      <div className="wrap">
        <SectionHeader
          kicker={t.kicker}
          title={
            <>
              {t.titlePre} <span className="ghost-word">{t.titleGhost}</span>
            </>
          }
          lead={t.lead}
        />

        <div className={styles.grid}>
          {t.features.map((f) => (
            <article
              key={f.title}
              data-reveal
              className={`card ${styles.cell}`}
              style={{ gridArea: f.area }}
            >
              <span className={styles.glyph}>{f.glyph}</span>
              <div className={styles.text}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
              {f.widget ? (
                <div className={styles.widgetSlot}>{f.widget}</div>
              ) : (
                <span className={styles.tag}>{f.tag}</span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
