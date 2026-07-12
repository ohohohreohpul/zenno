import type { Lang } from '../lang'

export interface FaqItem {
  q: string
  a: string
}

/** Shared with the FAQPage JSON-LD schema so the structured data never drifts from the visible copy. */
export const HOMEPAGE_FAQ: Record<Lang, FaqItem[]> = {
  en: [
    {
      q: 'Will WhatsApp ban my number?',
      a: 'Zenno warms your number up automatically — daily limits start small (20/day) and grow with the number’s age, up to a ceiling, with enforced gaps between bulk sends. Replies to customers who message you first are the safest traffic there is, and always go through.',
    },
    {
      q: 'Do I need Meta business verification or a BSP?',
      a: 'No. WhatsApp connects with the linked-device method — the same as WhatsApp Web. You scan a QR with your own phone. Telegram is a bot token, LINE and Messenger use keys, and web chat is a single script tag.',
    },
    {
      q: 'Can I take over a conversation?',
      a: 'Any time. The moment you type a reply, the AI pauses for that contact — no bot talking over a human. One button hands the thread back to the agent when you’re done.',
    },
    {
      q: 'What happens with refunds or medical questions?',
      a: 'Risky topics auto-escalate with an Attention Required flag. The agent never guesses on refunds, complaints, or medical questions — it hands them to you.',
    },
    {
      q: 'How does the agent learn my business?',
      a: 'Point the setup wizard at your website. Zenno scrapes it, generates the agent’s knowledge and personality, and lets you test-drive the agent privately before any customer talks to it.',
    },
  ],
  de: [
    {
      q: 'Wird WhatsApp meine Nummer sperren?',
      a: 'Zenno wärmt die Nummer automatisch auf — Tageslimits starten klein (20/Tag) und wachsen mit dem Alter der Nummer, bis zu einer Obergrenze, mit festen Abständen zwischen Massenversänden. Antworten an Kunden, die zuerst schreiben, sind der sicherste Traffic überhaupt und gehen immer durch.',
    },
    {
      q: 'Brauche ich eine Meta-Unternehmensverifizierung oder einen BSP?',
      a: 'Nein. WhatsApp verbindet sich über die Linked-Device-Methode — genau wie WhatsApp Web. Ein QR-Code wird mit dem eigenen Handy gescannt. Telegram läuft über einen Bot-Token, LINE und Messenger über Schlüssel, und Webchat ist ein einziges Script-Tag.',
    },
    {
      q: 'Kann ich ein Gespräch übernehmen?',
      a: 'Jederzeit. Sobald selbst eine Antwort getippt wird, pausiert die KI für diesen Kontakt — kein Bot spricht über einen Menschen hinweg. Ein Klick gibt den Thread zurück an den Agenten.',
    },
    {
      q: 'Was passiert bei Rückerstattungen oder medizinischen Fragen?',
      a: 'Riskante Themen eskalieren automatisch mit einer Markierung „Aufmerksamkeit nötig“. Der Agent rät nie bei Rückerstattungen, Beschwerden oder medizinischen Fragen — er gibt sie weiter.',
    },
    {
      q: 'Wie lernt der Agent den Betrieb kennen?',
      a: 'Der Einrichtungsassistent bekommt die Website-URL. Zenno durchsucht sie, erzeugt das Wissen und die Persönlichkeit des Agenten und lässt eine private Testfahrt zu, bevor ein Kunde mit ihm spricht.',
    },
  ],
}

/** English only — deep-dive pages are not yet translated. */
export const PRICING_FAQ: FaqItem[] = [
  {
    q: 'What counts as a reply?',
    a: 'Every message the agent sends counts as one reply. Customer messages you receive don’t count against your limit.',
  },
  {
    q: 'What happens if I go over my monthly limit?',
    a: 'You’ll get a heads-up before you hit the ceiling. Upgrade any time — there’s no hard cutoff mid-conversation.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrade or downgrade whenever the calendar changes shape — changes apply from your next billing cycle.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'No setup fee on any plan. Connecting a channel and running the setup wizard takes minutes, not an onboarding project.',
  },
  {
    q: 'What’s included in the free trial?',
    a: 'Full access to the Growth plan for 14 days — every channel, the AI agent, and the daily summary — no card required to start.',
  },
]

/** English only — deep-dive pages are not yet translated. */
export const COMPARISON_FAQ: FaqItem[] = [
  {
    q: 'Can I migrate my existing ManyChat or DMChamp flows?',
    a: 'There’s nothing to migrate one-to-one — Zenno replaces flow-building with a setup wizard that scrapes your site and writes the agent’s knowledge directly. Most studios are live within the hour.',
  },
  {
    q: 'Do I lose my existing automations?',
    a: 'You’ll rebuild the outcomes, not the flowcharts. Lifecycle stages, follow-ups, and broadcasts are built in and configured through the dashboard, not a drag-and-drop canvas.',
  },
  {
    q: 'Why not just keep ManyChat and add a booking tool?',
    a: 'Stitching two tools together means the chat and the calendar never fully agree on availability. Zenno reads the live schedule directly, so the offer the agent makes is always the real one.',
  },
  {
    q: 'Is switching risky during a busy season?',
    a: 'Run Zenno alongside your current setup during the test-drive step — nothing goes live until you approve the agent’s knowledge and tone.',
  },
]
