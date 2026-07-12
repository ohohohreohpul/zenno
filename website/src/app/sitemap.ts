import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/marketing/config'

export const dynamic = 'force-static'

// The dashboard, login, and API routes are excluded — they're app surfaces
// behind auth, not public marketing content search engines should index.
export default function sitemap(): MetadataRoute.Sitemap {
  const marketingRoutes = [
    { path: '/', priority: 1 },
    { path: '/de', priority: 1 },
    { path: '/yoga-studios', priority: 0.8 },
    { path: '/salons-spas', priority: 0.8 },
    { path: '/clinics', priority: 0.8 },
    { path: '/pricing', priority: 0.7 },
    { path: '/comparison', priority: 0.7 },
  ]

  return marketingRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: 'weekly',
    priority: route.priority,
    ...(route.path === '/' || route.path === '/de'
      ? { alternates: { languages: { en: `${SITE_URL}/`, de: `${SITE_URL}/de` } } }
      : {}),
  }))
}
