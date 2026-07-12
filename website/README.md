# Zenno Website

The public marketing site — homepage (English + German), the three vertical
landing pages, and the pricing/comparison deep-dives. Fully static: every
route is prerendered at build time, so it can be hosted anywhere that serves
static files.

This is a separate project from `../app` (the product dashboard). It has no
server code, no database, no auth — just static HTML/CSS/JS plus a handful of
build-time-only route handlers (`sitemap.xml`, `robots.txt`, OG images).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

One environment variable controls where "Get started free" / "Sign in"
buttons point, since the app dashboard is a different deployment:

```bash
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

Defaults to `https://zen-agent.vercel.app` if unset. Set this as a build-time
environment variable on whichever host you use (see below).

The site's own canonical domain is hardcoded as `SITE_URL` in three files
(`src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`,
`src/lib/marketing/jsonld.ts`) for metadata, hreflang, sitemap, and
structured-data URLs. Update those to your real domain before launch.

## Deploying to Vercel

1. Push this `website/` folder to its own Git repo (or import the monorepo
   and set the project's **Root Directory** to `website/` in Vercel's
   project settings).
2. Import the repo in Vercel — framework preset "Next.js" is auto-detected.
3. Add the `NEXT_PUBLIC_APP_URL` environment variable in Project Settings →
   Environment Variables.
4. Deploy. Vercel runs `next build` and serves the static export directly —
   no server function cost since every route is static.

## Deploying to Hostinger (or any static host)

1. Set `NEXT_PUBLIC_APP_URL` locally and build:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-app-domain.com npm run build
   ```
2. This produces a static site in `out/` — plain HTML, CSS, JS, and images,
   no Node.js server required.
3. Upload the **contents** of `out/` (not the folder itself) to your
   Hostinger `public_html/` directory via the File Manager or FTP/SFTP.
4. Point your domain at that directory. No build step runs on Hostinger —
   you're uploading the already-built static files.

If Hostinger's plan includes Node.js hosting (VPS/Cloud), you can
alternatively remove `output: "export"` from `next.config.ts` and run
`npm run build && npm run start` instead — not necessary for this site,
since nothing here needs a server at request time.

## Structure

```
src/
├── app/                    routes (page.tsx per URL, sitemap.ts, robots.ts, opengraph-image.tsx)
│   ├── de/                 German homepage
│   ├── yoga-studios/       vertical landing pages
│   ├── salons-spas/
│   ├── clinics/
│   ├── pricing/            pricing deep-dive
│   └── comparison/         comparison deep-dive
├── components/marketing/   all UI components (sections, widgets, primitives)
├── lib/marketing/          lang types, GSAP setup, JSON-LD builders, shared content (pricing/comparison/FAQ data)
└── styles/marketing.css    the `.zx`-scoped design system — self-contained, no Tailwind
```

Adding a new language: give each section component a `de`-style entry in its
`STRINGS`/content object, then add a new `app/<locale>/page.tsx` rendering
`<HomePage lang="<locale>" />`.
