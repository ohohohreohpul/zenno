import { NextRequest, NextResponse } from 'next/server'
import { getContacts, getLastMessage } from '@/lib/queries'

interface ContactRow { id: string; workspaceId: string; externalId: string; channel: string; name: string | null; phone?: string; instagramHandle?: string; lifecycleStage: string; tags?: string[]; botActive?: boolean; dnd?: boolean; chatStatus?: string; attentionRequired?: boolean; notes?: string; unread?: number; createdAt: string; updatedAt: string }
interface MessageRow { id: string; content: string; direction: string; createdAt: string }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'
  const contacts = (await getContacts(workspaceId) as unknown as ContactRow[]).slice(0, 100)
  const data = await Promise.all(contacts.map(async (c) => {
    const last = await getLastMessage(c.id) as MessageRow | null
    return {
      contact: { id: c.id, workspace_id: c.workspaceId, external_id: c.externalId, channel: c.channel, name: c.name, phone: c.phone, instagram_handle: c.instagramHandle ?? null, lifecycle_stage: c.lifecycleStage, tags: c.tags ?? [], bot_active: c.botActive ?? true, dnd: c.dnd ?? false, chat_status: c.chatStatus ?? 'open', attention_required: c.attentionRequired ?? false, notes: c.notes ?? '', created_at: c.createdAt, updated_at: c.updatedAt },
      messages: [],
      last_message: last ? { id: last.id, content: last.content, direction: last.direction, created_at: last.createdAt } : null,
      unread_count: c.unread ?? 0,
    }
  }))
  return NextResponse.json({ data })
}
