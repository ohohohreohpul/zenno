import type { Lang } from '@/lib/marketing/lang'
import { HOMEPAGE_FAQ } from '@/lib/marketing/content/faq'
import { SectionHeader } from './primitives/SectionHeader'
import { FaqAccordion } from './primitives/FaqAccordion'
import styles from './Faq.module.css'

const STRINGS: Record<Lang, { kicker: string; titlePre: string; titleGhost: string; lead: string }> = {
  en: {
    kicker: 'The honest answers',
    titlePre: 'Straight answers',
    titleGhost: 'to the real objections.',
    lead: 'We lead with the ban question because it’s the one everybody asks.',
  },
  de: {
    kicker: 'Die ehrlichen Antworten',
    titlePre: 'Klare Antworten',
    titleGhost: 'auf die echten Einwände.',
    lead: 'Wir beginnen mit der Sperr-Frage, weil sie jeder stellt.',
  },
}

interface FaqProps {
  lang?: Lang
}

export function Faq({ lang = 'en' }: FaqProps) {
  const t = STRINGS[lang]
  const items = HOMEPAGE_FAQ[lang]

  return (
    <section className="pad-y">
      <div className={`wrap ${styles.layout}`}>
        <div className={styles.left}>
          <SectionHeader
            kicker={t.kicker}
            title={
              <>
                {t.titlePre} <span className="ghost-word">{t.titleGhost}</span>
              </>
            }
            lead={t.lead}
          />
        </div>

        <FaqAccordion items={items} />
      </div>
    </section>
  )
}
