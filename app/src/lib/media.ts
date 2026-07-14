import type { IncomingMedia } from '@/types'

/**
 * Multimodal inbound understanding. Customers (especially in Asia) lead with
 * voice notes and photos. Before the sales agent replies, we turn media into
 * text the agent can reason over:
 *  - audio → transcription (requires a transcription provider when configured)
 *  - image → vision description (uses the same LLM layer as the agent)
 *
 * Everything degrades gracefully: if no provider is configured, the media is
 * summarized as a placeholder so the agent can still ask the customer to
 * clarify — it never silently ignores a voice note.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

function usesOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

function transcriptionConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY, // OpenRouter exposes whisper models
  )
}

export interface MediaDescription {
  text: string
  understood: boolean
}

/**
 * Returns a single string the agent can read: a "[Voice note]" or "[Photo]"
 * prefix plus a transcription/description. Caller should prepend this to the
 * inbound content (or use it as the content when there's no text).
 */
export async function describeMedia(
  media: IncomingMedia[],
  businessContext = 'a customer messaging a business',
): Promise<MediaDescription> {
  const parts: string[] = []

  for (const m of media) {
    if (m.type === 'audio') {
      const transcript = await transcribeAudio(m)
      parts.push(transcript ?? `[Voice note received — ${m.caption ?? 'no caption'}. Transcription unavailable, ask the customer what they said.]`)
    } else if (m.type === 'image') {
      const desc = await describeImage(m, businessContext)
      parts.push(desc ?? `[Photo received — ${m.caption ?? 'no caption'}. Vision unavailable, ask the customer to describe it.]`)
    } else if (m.type === 'video') {
      parts.push(`[Video note received — ${m.caption ?? 'no caption'}. Ask the customer what's in it.]`)
    } else if (m.type === 'document') {
      parts.push(`[Document received — ${m.caption ?? m.mime ?? 'unknown file'}. Ask the customer what they need from it.]`)
    }
  }

  return {
    text: parts.join('\n'),
    understood: parts.length > 0,
  }
}

async function transcribeAudio(media: IncomingMedia): Promise<string | null> {
  if (!transcriptionConfigured()) return null
  try {
    // Prefer OpenAI Whisper via direct API when an OpenAI key is present.
    if (process.env.OPENAI_API_KEY) {
      const audioBytes = await fetchMediaBytes(media.url)
      if (!audioBytes) return null
      const form = new FormData()
      const blob = new Blob([audioBytes.buffer as ArrayBuffer], { type: media.mime ?? 'audio/ogg' })
      form.append('file', blob, 'voice.ogg')
      form.append('model', 'whisper-1')
      form.append('language', 'en')
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { text?: string }
      const text = data.text?.trim()
      return text ? `[Voice note transcript]: ${text}` : null
    }
    // Fallback: ask the LLM to summarize the fact that a voice note arrived.
    // (OpenRouter doesn't transcribe audio inline without a whisper route.)
    return null
  } catch {
    return null
  }
}

async function describeImage(media: IncomingMedia, businessContext: string): Promise<string | null> {
  if (!usesOpenRouter() && !hasAnthropic()) return null
  try {
    if (usesOpenRouter()) {
      const system = `You are looking at a photo sent by ${businessContext}. Describe in 1-3 sentences what is in the image that matters for a sales conversation — the product, any visible price/text, the customer's situation. Be concise and factual. Do not invent details.`
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? 'z-ai/glm-4.5-air',
          max_tokens: 200,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: [
                { type: 'text', text: media.caption ? `Caption: ${media.caption}` : 'Describe this image.' },
                { type: 'image_url', image_url: { url: media.url } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const text = data.choices?.[0]?.message?.content?.trim()
      return text ? `[Photo description]: ${text}` : null
    }
    // Anthropic direct path
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `You are looking at a photo sent by ${businessContext}. Describe concisely (1-3 sentences) what matters for a sales conversation. Do not invent details.${media.caption ? ` Caption: ${media.caption}` : ''}` },
            { type: 'image', source: { type: 'url', url: media.url } },
          ],
        },
      ],
    })
    const block = response.content[0]
    return block && block.type === 'text' ? `[Photo description]: ${block.text}` : null
  } catch {
    return null
  }
}

async function fetchMediaBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}
