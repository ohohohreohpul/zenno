import type { Lang } from '@/lib/marketing/lang'
import styles from './Footer.module.css'

interface FooterLink {
  label: string
  href: string
}

interface FooterCol {
  title: string
  links: FooterLink[]
}

const STRINGS: Record<
  Lang,
  { tagline: string; cols: FooterCol[]; rights: string; made: string }
> = {
  en: {
    tagline: 'Your chats, answered. Your calendar, filled.',
    cols: [
      {
        title: 'Product',
        links: [
          { label: 'How it works', href: '/#how' },
          { label: 'Features', href: '/#features' },
          { label: 'Channels', href: '/#channels' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Comparison', href: '/comparison' },
        ],
      },
      {
        title: 'Use cases',
        links: [
          { label: 'Yoga studios', href: '/yoga-studios' },
          { label: 'Salons & spas', href: '/salons-spas' },
          { label: 'Clinics', href: '/clinics' },
          { label: 'Wellness centres', href: '/#' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '#' },
          { label: 'Careers', href: '#' },
          { label: 'Privacy', href: '#' },
          { label: 'Terms', href: '#' },
          { label: 'Contact', href: '#' },
        ],
      },
    ],
    rights: 'All rights reserved.',
    made: 'Built for the businesses that were losing the 11pm inquiry.',
  },
  de: {
    tagline: 'Ihre Chats, beantwortet. Ihr Kalender, gefüllt.',
    cols: [
      {
        title: 'Produkt',
        links: [
          { label: 'So funktioniert’s', href: '/de#how' },
          { label: 'Funktionen', href: '/de#features' },
          { label: 'Kanäle', href: '/de#channels' },
          { label: 'Preise', href: '/pricing' },
          { label: 'Vergleich', href: '/comparison' },
        ],
      },
      {
        title: 'Anwendungsfälle',
        links: [
          { label: 'Yogastudios', href: '/yoga-studios' },
          { label: 'Salons & Spas', href: '/salons-spas' },
          { label: 'Kliniken', href: '/clinics' },
          { label: 'Wellness-Zentren', href: '/#' },
        ],
      },
      {
        title: 'Unternehmen',
        links: [
          { label: 'Über uns', href: '#' },
          { label: 'Karriere', href: '#' },
          { label: 'Datenschutz', href: '#' },
          { label: 'AGB', href: '#' },
          { label: 'Kontakt', href: '#' },
        ],
      },
    ],
    rights: 'Alle Rechte vorbehalten.',
    made: 'Gebaut für Betriebe, die die 23-Uhr-Anfrage nicht mehr verpassen.',
  },
}

interface FooterProps {
  lang?: Lang
}

export function Footer({ lang = 'en' }: FooterProps) {
  const t = STRINGS[lang]
  const home = lang === 'de' ? '/de' : '/'

  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.brand}>
          <a href={`${home}#top`} className={styles.logo}>
            <span className={styles.mark} aria-hidden />
            zenno
          </a>
          <p className={styles.tagline}>{t.tagline}</p>
          <div className={styles.channels}>
            {[
              ['WhatsApp', 'var(--wa)'],
              ['Telegram', 'var(--tg)'],
              ['LINE', 'var(--ln)'],
              ['Messenger', 'var(--ms)'],
              ['Web', 'var(--wc)'],
            ].map(([n, c]) => (
              <span key={n} className={styles.ch}>
                <i style={{ background: c }} />
                {n}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.cols}>
          {t.cols.map((col) => (
            <nav key={col.title} className={styles.col} aria-label={col.title}>
              <span className={styles.colTitle}>{col.title}</span>
              {col.links.map((l) => (
                <a key={l.label} href={l.href} className={styles.link}>
                  {l.label}
                </a>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <div className={`wrap ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} Zenno. {t.rights}</span>
        <span className={styles.made}>{t.made}</span>
      </div>
    </footer>
  )
}
