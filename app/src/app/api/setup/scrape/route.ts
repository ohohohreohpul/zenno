import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateReplyCore, hasAiKey } from '@/lib/ai'

const FETCH_TIMEOUT_MS = 12_000
const MAX_PAGES = 5
const MAX_TEXT_CHARS_PER_PAGE = 8_000
const MAX_TOTAL_CHARS = 30_000

const requestSchema = z.object({
  url: z.string().url(),
  businessType: z.string().min(1).max(60).default('wellness studio'),
})

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']

function isBlockedUrl(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return true
  const host = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.includes(host)) return true
  if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
  return false
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS_PER_PAGE)
}

interface PageLink {
  href: string
  text: string
  score: number
}

// Keywords that signal sales-relevant pages. Higher score = higher priority.
const PAGE_KEYWORDS: { re: RegExp; score: number }[] = [
  { re: /pric(e|ing)/i, score: 10 },
  { re: /schedul(e|ing)/i, score: 9 },
  { re: /class(e|es)/i, score: 8 },
  { re: /service(s)?/i, score: 8 },
  { re: /treatment/i, score: 8 },
  { re: /menu/i, score: 7 },
  { re: /faq|frequently.asked|question/i, score: 7 },
  { re: /book(ing)?|appoint(ment)?|reserve/i, score: 7 },
  { re: /about|team|staff|therapist|instructor/i, score: 5 },
  { re: /package|offer|promo|deal/i, score: 6 },
  { re: /membership|plan/i, score: 6 },
  { re: /location|contact|find/i, score: 4 },
  { re: /review|testimonial/i, score: 3 },
]

function extractLinks(html: string, baseUrl: URL): PageLink[] {
  const links: PageLink[] = []
  const anchorRe = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html)) !== null) {
    const rawHref = match[1]
    const text = htmlToText(match[2]).slice(0, 80)
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) continue
    let resolved: URL
    try {
      resolved = new URL(rawHref, baseUrl)
    } catch {
      continue
    }
    if (resolved.hostname !== baseUrl.hostname) continue
    if (resolved.pathname === baseUrl.pathname && !resolved.search) continue
    const label = `${text} ${resolved.pathname}`.toLowerCase()
    const score = PAGE_KEYWORDS.reduce((max, k) => (k.re.test(label) ? Math.max(max, k.score) : max), 0)
    links.push({ href: resolved.toString(), text, score })
  }
  // Dedupe by href, keep highest score, sort.
  const byHref = new Map<string, PageLink>()
  for (const l of links) {
    const existing = byHref.get(l.href)
    if (!existing || l.score > existing.score) byHref.set(l.href, l)
  }
  return [...byHref.values()].sort((a, b) => b.score - a.score)
}

function fallbackPrompt(businessType: string, siteText: string, url: string): string {
  return `You are a senior sales agent for a ${businessType}. Your job is to turn conversations into bookings and revenue — not just answer questions.

Qualify fast, build value before price, handle objections by reframing and proposing a next step, and always move toward a booking or a sale. Use your tools to check the schedule, book the moment they agree, and escalate refunds/complaints/medical to a human. Keep replies to 2–4 sentences, sound human, match their language, and never give up after one objection.

Business website: ${url}

Information extracted from the website:
${siteText.slice(0, 4000)}

Always reply in the same language the contact is using.`
}

const PROMPT_WRITER_SYSTEM = `You write system prompts for AI SALES agents of small businesses. Given a business's website text (possibly from several pages), produce a system prompt that makes the agent SELL, not just answer questions.

The prompt must include:
1. The agent's role: a senior sales agent whose goal is bookings, deals, and revenue — framed as genuinely helping the customer.
2. Concrete facts found on the site: business name, services/classes/treatments, schedules, prices, packages/memberships, location, contact policies, differentiators. If a fact isn't in the text, do NOT invent it — write "Ask the business to confirm" for that slot.
3. Sales behavior: qualify (one question at a time), build value before price, handle objections (don't fold after one "no"), always propose a concrete next step, use tools to check the schedule and book, create a deal when a paid offering is discussed, escalate refunds/complaints/medical/payments to a human.
4. Style: short replies (2–4 sentences), sound human, break long replies into two messages, match the customer's language, no robotic sign-offs, no bullet lists in chat.

Output ONLY the system prompt text, no preamble or commentary.`

async function fetchPage(target: URL): Promise<{ text: string; html: string } | null> {
  try {
    const res = await fetch(target.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentSetupBot/1.0)' },
    })
    if (!res.ok) return null
    const html = await res.text()
    return { text: htmlToText(html), html }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { url: rawUrl, businessType } = parsed.data
  const url = new URL(rawUrl)
  if (isBlockedUrl(url)) {
    return NextResponse.json({ error: 'This URL is not allowed' }, { status: 422 })
  }

  // 1. Fetch the homepage (keep its HTML for link discovery).
  const home = await fetchPage(url)
  if (!home || !home.text) {
    return NextResponse.json({ error: 'Could not read the website' }, { status: 422 })
  }

  // 2. Discover sales-relevant sub-pages and fetch up to MAX_PAGES of them.
  const candidates = extractLinks(home.html, url).filter((l) => l.score > 0)
  const visited = new Set<string>([url.toString().replace(/#.*$/, '')])
  const pageTexts: string[] = [`[Homepage — ${url.pathname || '/'}]\n${home.text}`]

  for (const link of candidates) {
    if (pageTexts.length - 1 >= MAX_PAGES) break
    const cleanHref = link.href.replace(/#.*$/, '')
    if (visited.has(cleanHref)) continue
    visited.add(cleanHref)
    const page = await fetchPage(new URL(cleanHref))
    if (page && page.text) {
      const label = pageTexts.length === 1 ? '[Homepage]' : `[${link.text || new URL(cleanHref).pathname}]`
      pageTexts.push(`${label}\n${page.text}`)
    }
  }

  let combined = pageTexts.join('\n\n---\n\n')
  if (combined.length > MAX_TOTAL_CHARS) combined = combined.slice(0, MAX_TOTAL_CHARS)
  const pagesFetched = pageTexts.length

  if (!hasAiKey()) {
    return NextResponse.json({
      data: {
        systemPrompt: fallbackPrompt(businessType, combined, url.toString()),
        knowledgeSummary: combined,
        siteTextPreview: combined.slice(0, 400),
        pagesScraped: pagesFetched,
        aiGenerated: false,
      },
    })
  }

  try {
    const systemPrompt = await generateReplyCore(
      PROMPT_WRITER_SYSTEM,
      [],
      `Business type: ${businessType}\nWebsite: ${url.toString()}\nPages scraped: ${pagesFetched}\n\nWebsite text:\n${combined}`,
      1600,
    )
    return NextResponse.json({
      data: { systemPrompt, knowledgeSummary: combined, siteTextPreview: combined.slice(0, 400), pagesScraped: pagesFetched, aiGenerated: true },
    })
  } catch {
    return NextResponse.json({
      data: {
        systemPrompt: fallbackPrompt(businessType, combined, url.toString()),
        knowledgeSummary: combined,
        siteTextPreview: combined.slice(0, 400),
        pagesScraped: pagesFetched,
        aiGenerated: false,
      },
    })
  }
}
