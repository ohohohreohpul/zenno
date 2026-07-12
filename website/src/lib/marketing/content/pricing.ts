import type { Lang } from '../lang'

export interface PricingTier {
  name: string
  price: string
  line: string
  cta: string
  popular?: boolean
  teaserFeatures: string[]
}

export const PRICING_TIERS: Record<Lang, PricingTier[]> = {
  en: [
    {
      name: 'Starter',
      price: '€99',
      line: '1 channel · 500 replies / mo',
      cta: 'Choose plan',
      teaserFeatures: ['One channel (WhatsApp or web)', 'AI booking agent', 'Unified inbox', 'Warm-up protection'],
    },
    {
      name: 'Growth',
      price: '€249',
      line: 'All channels · 2,500 replies / mo',
      cta: 'Start free trial',
      popular: true,
      teaserFeatures: ['Every channel connected', 'Lifecycle autopilot + broadcast', 'Guardrails & escalation', 'Daily summary digest'],
    },
    {
      name: 'Agency',
      price: '€499',
      line: 'Multi-location · white-label',
      cta: 'Choose plan',
      teaserFeatures: ['Multiple locations', 'White-label domains', 'Sub-account provisioning', 'Rollup dashboards'],
    },
  ],
  de: [
    {
      name: 'Starter',
      price: '€99',
      line: '1 Kanal · 500 Antworten / Monat',
      cta: 'Plan wählen',
      teaserFeatures: ['Ein Kanal (WhatsApp oder Web)', 'KI-Buchungsagent', 'Zentraler Posteingang', 'Aufwärmschutz'],
    },
    {
      name: 'Growth',
      price: '€249',
      line: 'Alle Kanäle · 2.500 Antworten / Monat',
      cta: 'Kostenlose Testphase starten',
      popular: true,
      teaserFeatures: ['Jeder Kanal verbunden', 'Lifecycle-Autopilot + Broadcast', 'Guardrails & Eskalation', 'Tägliche Zusammenfassung'],
    },
    {
      name: 'Agency',
      price: '€499',
      line: 'Mehrere Standorte · White-Label',
      cta: 'Plan wählen',
      teaserFeatures: ['Mehrere Standorte', 'White-Label-Domains', 'Unterkonten-Verwaltung', 'Sammel-Dashboards'],
    },
  ],
}
