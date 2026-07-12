'use client'

import type { ReactNode } from 'react'
import type { Lang } from '@/lib/marketing/lang'
import { WarmupGauge } from './widgets/WarmupGauge'
import { AiToggle } from './widgets/AiToggle'
import styles from './UspSplits.module.css'

function ConnectVisual({ lang }: { lang: Lang }) {
  return (
    <div className={styles.connectStack}>
      <img
        src="/images/qr-hands.webp"
        alt={
          lang === 'de'
            ? 'Scannen eines QR-Codes mit dem Handy, um WhatsApp zu verbinden'
            : 'Scanning a QR code with a phone to connect WhatsApp'
        }
        className={styles.connectPhoto}
        loading="lazy"
      />
      <div className={styles.connectGauge}>
        <WarmupGauge lang={lang} />
      </div>
    </div>
  )
}

function BooksVisual({ lang }: { lang: Lang }) {
  const rows =
    lang === 'de'
      ? ['Prüft echte Verfügbarkeit', 'Bucht in den Kalender', 'Löst die Folgeaktion aus']
      : ['Checks real availability', 'Books into your calendar', 'Fires the follow-up']
  return (
    <div className={styles.booksCard}>
      <div className={styles.booksHead}>
        <span className={styles.strike}>
          {lang === 'de' ? 'Chatbots chatten.' : 'Chatbots chat.'}
        </span>
        <strong>{lang === 'de' ? 'Zenno bucht.' : 'Zenno books.'}</strong>
      </div>
      <ul className={styles.checks}>
        {rows.map((r) => (
          <li key={r}>
            <span className={styles.check}>✓</span>
            {r}
          </li>
        ))}
      </ul>
      <div className={styles.booked}>
        <span className="dot" /> {lang === 'de' ? 'Gebucht · Sa. 10:00' : 'Booked · Sat 10:00'}
      </div>
    </div>
  )
}

interface Split {
  kicker: string
  title: ReactNode
  body: string
  visual: ReactNode
  flip?: boolean
}

function buildSplits(lang: Lang): Split[] {
  if (lang === 'de') {
    return [
      {
        kicker: 'Die eigene Nummer',
        title: (
          <>
            Das eigene WhatsApp. <span className="ghost-word">Keine gemietete Nummer.</span>
          </>
        ),
        body: 'Keine Meta-Unternehmensverifizierung, keine BSP-Verträge, keine gemieteten Telefonnummern. Neue Nummern erhalten automatischen Aufwärmschutz — die ehrliche Antwort auf den Einwand Nr. 1.',
        visual: <ConnectVisual lang="de" />,
      },
      {
        kicker: 'Bucht, statt nur zu chatten',
        title: (
          <>
            Ein Chatbot endet mit{' '}
            <span className="ghost-word">„jemand meldet sich bei Ihnen.“</span>
          </>
        ),
        body: 'Zenno endet mit einer bestätigten Buchung. Der Agent hat echte Werkzeuge: Er liest den Live-Kalender, bietet echte freie Termine an, trägt den Termin ein und löst die Folgeaktion aus.',
        visual: <BooksVisual lang="de" />,
        flip: true,
      },
      {
        kicker: 'Sie behalten die Kontrolle',
        title: (
          <>
            KI antwortet. <span className="ghost-word">Sie behalten die Kontrolle.</span>
          </>
        ),
        body: 'Sobald selbst geantwortet wird, pausiert die KI für diesen Kontakt — kein Bot spricht über einen Menschen hinweg. Riskante Themen eskalieren automatisch mit einer Markierung „Aufmerksamkeit nötig“.',
        visual: <AiToggle lang="de" />,
      },
    ]
  }
  return [
    {
      kicker: 'Their own number',
      title: (
        <>
          Their own WhatsApp. <span className="ghost-word">Not a rented number.</span>
        </>
      ),
      body: 'No Meta business verification, no BSP contracts, no rented phone numbers. Fresh numbers get automatic warm-up protection — this is the honest answer to the #1 objection.',
      visual: <ConnectVisual lang="en" />,
    },
    {
      kicker: 'It books, it doesn’t just chat',
      title: (
        <>
          A chatbot ends with <span className="ghost-word">“someone will get back to you.”</span>
        </>
      ),
      body: 'Zenno ends with a confirmed booking. The agent has real tools: it reads the live schedule, offers actual open slots, writes the appointment to the calendar, and triggers the follow-up.',
      visual: <BooksVisual lang="en" />,
      flip: true,
    },
    {
      kicker: 'You stay in charge',
      title: (
        <>
          AI answers. <span className="ghost-word">You stay in charge.</span>
        </>
      ),
      body: 'The moment you type a reply, the AI pauses for that contact — no bot talking over a human. Risky topics auto-escalate with an Attention Required flag.',
      visual: <AiToggle lang="en" />,
    },
  ]
}

interface UspSplitsProps {
  lang?: Lang
}

export function UspSplits({ lang = 'en' }: UspSplitsProps) {
  const splits = buildSplits(lang)
  return (
    <section className="pad-y">
      <div className={`wrap ${styles.stack}`}>
        {splits.map((s, i) => (
          <div key={i} className={`${styles.split} ${s.flip ? styles.flip : ''}`}>
            <div className={styles.copy} data-reveal>
              <span className="kicker">{s.kicker}</span>
              <h3 className="sub">{s.title}</h3>
              <p className={styles.body}>{s.body}</p>
            </div>
            <div className={styles.visual} data-reveal>
              {s.visual}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
