/**
 * Facebook Messenger via the Graph Send API. Credentials are per-workspace
 * (page access token + page id). Inbound events arrive on the app-level
 * Meta webhook and are routed to a workspace by page id.
 *
 * GRAPH_API_BASE is overridable for tests.
 */

function graphBase(): string {
  return (process.env.GRAPH_API_BASE ?? 'https://graph.facebook.com/v19.0').replace(/\/$/, '')
}

export async function sendMessenger(
  pageAccessToken: string,
  recipientId: string,
  text: string,
): Promise<void> {
  const res = await fetch(
    `${graphBase()}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Messenger send failed: ${res.status} ${body.slice(0, 300)}`)
  }
}

/** Validate a page token; returns the page's name and id. */
export async function validatePageToken(
  pageAccessToken: string,
): Promise<{ pageId: string; pageName: string }> {
  const res = await fetch(
    `${graphBase()}/me?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`,
  )
  const body = (await res.json().catch(() => ({}))) as {
    id?: string
    name?: string
    error?: { message?: string }
  }
  if (!res.ok || !body.id) {
    throw new Error(`Meta rejected the page token: ${body.error?.message ?? res.status}`)
  }
  return { pageId: body.id, pageName: body.name ?? 'Facebook Page' }
}
