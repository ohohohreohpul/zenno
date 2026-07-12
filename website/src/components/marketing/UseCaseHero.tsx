import { appHref } from '@/lib/marketing/config'
import { ChatAutoplay, type ChatScript } from './ChatAutoplay'
import styles from './UseCaseHero.module.css'

interface UseCaseHeroProps {
  image: string
  kicker: string
  titlePre: string
  titleGhost: string
  lead: string
  ctaPrimary: string
  ctaSecondary: string
  chatScript: ChatScript
}

/**
 * A lighter, reusable hero for the vertical landing pages — same photographic
 * treatment as the homepage hero, but shorter and without the frame-breaking
 * proof card (kept simple since these pages don't carry the full GSAP timeline).
 */
export function UseCaseHero({
  image,
  kicker,
  titlePre,
  titleGhost,
  lead,
  ctaPrimary,
  ctaSecondary,
  chatScript,
}: UseCaseHeroProps) {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.media}>
        <img src={image} alt="" className={styles.img} fetchPriority="high" decoding="async" />
      </div>
      <div className={styles.scrim} aria-hidden />
      <div className={styles.scrimBottom} aria-hidden />
      <div className={styles.fadeToPage} aria-hidden />

      <div className={`wrap-wide ${styles.content}`}>
        <div className={styles.copy} data-reveal>
          <span className={styles.eyebrow}>
            <span className="dot" /> {kicker}
          </span>
          <h1 className={styles.headline}>
            {titlePre} <span className={styles.ghost}>{titleGhost}</span>
          </h1>
          <p className={styles.lead}>{lead}</p>
          <div className={styles.ctas}>
            <a href={appHref()} className="btn on-dark">
              {ctaPrimary} <span className="arrow">→</span>
            </a>
            <a href="#demo" className={`btn ${styles.ghostOnPhoto}`}>
              {ctaSecondary}
            </a>
          </div>
        </div>

        <div className={styles.chatCol} data-reveal>
          <ChatAutoplay script={chatScript} />
        </div>
      </div>
    </section>
  )
}
