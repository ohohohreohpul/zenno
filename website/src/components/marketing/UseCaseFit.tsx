import { SectionHeader } from './primitives/SectionHeader'
import styles from './UseCaseFit.module.css'

interface FitPoint {
  title: string
  body: string
}

interface UseCaseFitProps {
  kicker: string
  titlePre: string
  titleGhost: string
  points: FitPoint[]
}

export function UseCaseFit({ kicker, titlePre, titleGhost, points }: UseCaseFitProps) {
  return (
    <section className="pad-y">
      <div className="wrap">
        <SectionHeader
          kicker={kicker}
          title={
            <>
              {titlePre} <span className="ghost-word">{titleGhost}</span>
            </>
          }
        />
        <div className={styles.grid}>
          {points.map((p, i) => (
            <article key={p.title} data-reveal className={`card ${styles.card}`}>
              <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
