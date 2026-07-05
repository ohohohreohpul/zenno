import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateReplyCore, hasAiKey } from '@/lib/ai'

const FETCH_TIMEOUT_MS = 12_000
const MAX_TEXT_CHARS = 8_000

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
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS)
}

function fallbackPrompt(businessType: string, siteText: string, url: string): string {
  return `You are a warm, knowledgeable AI assistant for a ${businessType}. Help customers with schedules, pricing, services, and bookings.

Always be friendly, concise, and encouraging. Keep replies to 2-4 sentences. When someone seems interested, offer to book a trial or appointment. Respond in the same language the customer uses.

Business website: ${url}

Information extracted from the website:
${siteText.slice(0, 3000)}`
}

const PROMPT_WRITER_SYSTEM = `You write system prompts for AI sales agents of wellness/beauty businesses. Given website text, produce a system prompt that:
1. Opens with the agent's role and business name (found in the text)
2. Lists concrete facts: services, class/treatment names, schedules, prices, location, contact policies
3. Sets tone: warm, concise (2-4 sentences per reply), never pushy, always offers to book a trial/appointment when interest is shown
4. Instructs to reply in the customer's language
Output ONLY the system prompt text, no preamble.`

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

  let siteText = ''
  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentSetupBot/1.0)' },
    })
    if (!res.ok) throw new Error(`Site responded with ${res.status}`)
    siteText = htmlToText(await res.text())
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch the website'
    return NextResponse.json({ error: `Could not read the website: ${message}` }, { status: 422 })
  }

  if (!siteText) {
    return NextResponse.json({ error: 'The website returned no readable text' }, { status: 422 })
  }

  if (!hasAiKey()) {
    return NextResponse.json({
      data: {
        systemPrompt: fallbackPrompt(businessType, siteText, url.toString()),
        siteTextPreview: siteText.slice(0, 400),
        aiGenerated: false,
      },
    })
  }

  try {
    const systemPrompt = await generateReplyCore(
      PROMPT_WRITER_SYSTEM,
      [],
      `Business type: ${businessType}\nWebsite: ${url.toString()}\n\nWebsite text:\n${siteText}`,
    )
    return NextResponse.json({
      data: { systemPrompt, siteTextPreview: siteText.slice(0, 400), aiGenerated: true },
    })
  } catch {
    return NextResponse.json({
      data: {
        systemPrompt: fallbackPrompt(businessType, siteText, url.toString()),
        siteTextPreview: siteText.slice(0, 400),
        aiGenerated: false,
      },
    })
  }
}
