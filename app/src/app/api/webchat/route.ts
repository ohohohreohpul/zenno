import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db'
import { handleIncoming } from '@/lib/conversation'
import { ChannelConnection } from '@/models/ChannelConnection'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'

/**
 * Public API for the embeddable web chat widget. Authenticated by the
 * workspace's embed key; visitors are identified by a widget-generated id.
 * CORS is open — this is called from arbitrary customer websites.
 *
 *   POST { key, visitor, name?, text } → store + generate the agent reply
 *   GET  ?key&visitor&after=<ISO>      → messages for this visitor
 */

const MAX_TEXT_LENGTH = 2000
const HISTORY_LIMIT = 50

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function corsJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

async function findWorkspaceByKey(embedKey: string): Promise<string | null> {
  if (!embedKey) return null
  await connectDb()
  const conn = await ChannelConnection.findOne({
    channel: 'webchat',
    status: 'connected',
    'credentials.embedKey': embedKey,
  }).lean()
  return conn?.workspaceId ?? null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { key?: unknown; visitor?: unknown; name?: unknown; text?: unknown }
  try {
    body = await req.json()
  } catch {
    return corsJson({ error: 'Invalid JSON' }, 400)
  }

  const key = typeof body.key === 'string' ? body.key : ''
  const visitor = typeof body.visitor === 'string' ? body.visitor.slice(0, 64) : ''
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : ''
  const name = typeof body.name === 'string' ? body.name.slice(0, 80) : null
  if (!key || !visitor || !text) {
    return corsJson({ error: 'key, visitor and text are required' }, 400)
  }

  try {
    const workspaceId = await findWorkspaceByKey(key)
    if (!workspaceId) return corsJson({ error: 'Unknown embed key' }, 401)

    // handleIncoming stores the message, runs the agent, and stores the
    // reply — for webchat "delivery" is the widget's next poll.
    await handleIncoming(workspaceId, {
      channel: 'webchat',
      external_contact_id: visitor,
      contact_name: name,
      content: text,
      raw: { source: 'webchat-widget' },
    })
    return corsJson({ status: 'ok' })
  } catch (error: unknown) {
    console.error('[webchat] message failed:', error)
    return corsJson({ error: 'Something went wrong — try again' }, 500)
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const key = req.nextUrl.searchParams.get('key') ?? ''
  const visitor = req.nextUrl.searchParams.get('visitor') ?? ''
  const after = req.nextUrl.searchParams.get('after')
  if (!key || !visitor) return corsJson({ error: 'key and visitor are required' }, 400)

  try {
    const workspaceId = await findWorkspaceByKey(key)
    if (!workspaceId) return corsJson({ error: 'Unknown embed key' }, 401)

    const contact = await Contact.findOne({
      workspaceId,
      channel: 'webchat',
      externalId: visitor,
    }).lean()
    if (!contact) return corsJson({ data: [] })

    const query: Record<string, unknown> = { contactId: contact._id.toString() }
    if (after) {
      const afterDate = new Date(after)
      if (!Number.isNaN(afterDate.getTime())) query.createdAt = { $gt: afterDate }
    }
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(HISTORY_LIMIT)
      .lean()

    return corsJson({
      data: messages.map((m) => ({
        id: m._id.toString(),
        direction: m.direction,
        text: m.content,
        at: m.createdAt,
      })),
    })
  } catch (error: unknown) {
    console.error('[webchat] poll failed:', error)
    return corsJson({ error: 'Something went wrong' }, 500)
  }
}
