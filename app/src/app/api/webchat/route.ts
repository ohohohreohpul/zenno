import { NextRequest, NextResponse } from 'next/server'
import { handleIncoming } from '@/lib/conversation'
import { findChannelConnectionByEmbedKey, findContactByExternal, getMessages } from '@/lib/queries'

const MAX_TEXT_LENGTH = 2000
const HISTORY_LIMIT = 50
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
const corsJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS_HEADERS })
export async function OPTIONS(): Promise<NextResponse> { return new NextResponse(null, { status: 204, headers: CORS_HEADERS }) }

async function findWorkspaceByKey(key: string): Promise<string | null> {
  if (!key) return null
  const connection = await findChannelConnectionByEmbedKey(key) as { workspaceId?: string; status?: string } | null
  return connection?.status === 'connected' ? connection.workspaceId ?? null : null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { key?: unknown; visitor?: unknown; name?: unknown; text?: unknown }
  try { body = await req.json() } catch { return corsJson({ error: 'Invalid JSON' }, 400) }
  const key = typeof body.key === 'string' ? body.key : ''
  const visitor = typeof body.visitor === 'string' ? body.visitor.slice(0, 64) : ''
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : ''
  const name = typeof body.name === 'string' ? body.name.slice(0, 80) : null
  if (!key || !visitor || !text) return corsJson({ error: 'key, visitor and text are required' }, 400)
  try {
    const workspaceId = await findWorkspaceByKey(key)
    if (!workspaceId) return corsJson({ error: 'Unknown embed key' }, 401)
    await handleIncoming(workspaceId, { channel: 'webchat', external_contact_id: visitor, contact_name: name, content: text, raw: { source: 'webchat-widget' } })
    return corsJson({ status: 'ok' })
  } catch (error) { console.error('[webchat] message failed:', error); return corsJson({ error: 'Something went wrong — try again' }, 500) }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const key = req.nextUrl.searchParams.get('key') ?? ''
  const visitor = req.nextUrl.searchParams.get('visitor') ?? ''
  const after = req.nextUrl.searchParams.get('after')
  if (!key || !visitor) return corsJson({ error: 'key and visitor are required' }, 400)
  try {
    const workspaceId = await findWorkspaceByKey(key)
    if (!workspaceId) return corsJson({ error: 'Unknown embed key' }, 401)
    const contact = await findContactByExternal(workspaceId, visitor, 'webchat') as { id?: string } | null
    if (!contact?.id) return corsJson({ data: [] })
    let messages = await getMessages(contact.id) as Array<{ id: string; direction: string; content: string; createdAt: string }>
    if (after && !Number.isNaN(new Date(after).getTime())) messages = messages.filter((m) => new Date(m.createdAt) > new Date(after))
    return corsJson({ data: messages.slice(-HISTORY_LIMIT).map((m) => ({ id: m.id, direction: m.direction, text: m.content, at: m.createdAt })) })
  } catch (error) { console.error('[webchat] poll failed:', error); return corsJson({ error: 'Something went wrong' }, 500) }
}
