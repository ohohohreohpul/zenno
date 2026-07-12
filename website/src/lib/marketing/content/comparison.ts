import type { Lang } from '../lang'

export interface ComparisonRow {
  label: string
  many: boolean
  dm: boolean
  zenno: boolean
}

/** First 6 rows are shown on the homepage teaser; the deep-dive page shows all. */
export const COMPARISON_ROWS: Record<Lang, ComparisonRow[]> = {
  en: [
    { label: 'Automates messages', many: true, dm: true, zenno: true },
    { label: 'Answers open-ended chats', many: false, dm: true, zenno: true },
    { label: 'Reads a live schedule', many: false, dm: false, zenno: true },
    { label: 'Books the appointment', many: false, dm: false, zenno: true },
    { label: 'Their own number, no BSP', many: false, dm: false, zenno: true },
    { label: 'Built-in warm-up safety', many: false, dm: false, zenno: true },
    { label: 'Human takeover, pauses the bot', many: false, dm: true, zenno: true },
    { label: 'Segment-targeted broadcast', many: true, dm: true, zenno: true },
    { label: 'Lifecycle stage automation', many: false, dm: false, zenno: true },
    { label: 'Escalation guardrails (refunds, medical)', many: false, dm: false, zenno: true },
    { label: 'Setup by scraping your website', many: false, dm: false, zenno: true },
    { label: 'Native WhatsApp + Telegram + LINE', many: false, dm: false, zenno: true },
  ],
  de: [
    { label: 'Automatisiert Nachrichten', many: true, dm: true, zenno: true },
    { label: 'Beantwortet offene Chats', many: false, dm: true, zenno: true },
    { label: 'Liest den Live-Kalender', many: false, dm: false, zenno: true },
    { label: 'Bucht den Termin', many: false, dm: false, zenno: true },
    { label: 'Eigene Nummer, kein BSP', many: false, dm: false, zenno: true },
    { label: 'Eingebauter Aufwärmschutz', many: false, dm: false, zenno: true },
    { label: 'Übergabe an Menschen, pausiert den Bot', many: false, dm: true, zenno: true },
    { label: 'Segmentierter Broadcast', many: true, dm: true, zenno: true },
    { label: 'Lifecycle-Phasen-Automatisierung', many: false, dm: false, zenno: true },
    { label: 'Eskalations-Guardrails (Rückerstattung, medizinisch)', many: false, dm: false, zenno: true },
    { label: 'Einrichtung durch Website-Scraping', many: false, dm: false, zenno: true },
    { label: 'Nativ WhatsApp + Telegram + LINE', many: false, dm: false, zenno: true },
  ],
}
