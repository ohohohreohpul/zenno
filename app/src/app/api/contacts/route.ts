import { NextRequest, NextResponse } from 'next/server'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Contact } from '@/models/Contact'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'

  if (IS_MOCK) {
    const data = MockDB.getContacts(workspaceId).map((c) => ({
      id: c._id,
      workspace_id: c.workspaceId,
      external_id: c.externalId,
      channel: c.channel,
      name: c.name,
      phone: c.phone,
      instagram_handle: null,
      lifecycle_stage: c.lifecycleStage,
      tags: c.tags,
      bot_active: c.botActive,
      dnd: c.dnd,
      chat_status: c.chatStatus,
      attention_required: c.attentionRequired,
      notes: c.notes,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }))
    return NextResponse.json({ data })
  }

  await connectDb()

  const contacts = await Contact.find({ workspaceId }).sort({ updatedAt: -1 }).lean()
  const data = contacts.map((c) => ({
    id: c._id.toString(),
    workspace_id: c.workspaceId,
    external_id: c.externalId,
    channel: c.channel,
    name: c.name,
    phone: c.phone,
    instagram_handle: c.instagramHandle,
    lifecycle_stage: c.lifecycleStage,
    tags: c.tags ?? [],
    bot_active: c.botActive ?? true,
    dnd: c.dnd ?? false,
    chat_status: c.chatStatus ?? 'open',
    attention_required: c.attentionRequired ?? false,
    notes: c.notes ?? '',
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }))

  return NextResponse.json({ data })
}
