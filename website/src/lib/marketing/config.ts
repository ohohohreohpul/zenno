/**
 * The marketing site is deployed independently of the product app (see
 * README for Vercel/Hostinger setup), so "Get started" / "Sign in" links
 * must point at the app's own domain instead of a relative path.
 * Set NEXT_PUBLIC_APP_URL at build time to override the default.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zen-agent.vercel.app'

export function appHref(path: string = '/dashboard'): string {
  return `${APP_URL}${path}`
}

/**
 * This site's own canonical domain — used for metadataBase, sitemap.xml,
 * robots.txt, and JSON-LD. Single source of truth; update this one constant
 * before launch instead of hunting across files.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zen-agent.vercel.app'
