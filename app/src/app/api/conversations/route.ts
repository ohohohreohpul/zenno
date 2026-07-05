import { NextRequest, NextResponse } from 'next/server'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Contact } from '@/models/Contact'
import { Message } from '@/models/Message'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'

  if (IS_MOCK) {
    const contacts = MockDB.getContacts(workspaceId).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )
    const data = contacts.map((contact) => ({
      contact: {
        id: contact._id,
        workspace_id: contact.workspaceId,
        external_id: contact.externalId,
        channel: contact.channel,
        name: contact.name,
        phone: contact.phone,
        instagram_handle: null,
        lifecycle_stage: contact.lifecycleStage,
        tags: contact.tags,
        bot_active: contact.botActive,
        dnd: contact.dnd,
        chat_status: contact.chatStatus,
        attention_required: contact.attentionRequired,
        notes: contact.notes,
        created_at: contact.createdAt,
        updated_at: contact.updatedAt,
      },
      messages: [],
      last_message: (() => {
        const m = MockDB.getLastMessage(contact._id)
        return m ? { id: m._id, content: m.content, direction: m.direction, created_at: m.createdAt } : null
      })(),
      unread_count: contact.unread,
    }))
    return NextResponse.json({ data })
  }

  await connectDb()

  const contacts = await Contact.find({ workspaceId })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean()

  if (!contacts.length) return NextResponse.json({ data: [] })

  const conversations = await Promise.all(
    contacts.map(async (contact) => {
      const lastMsg = await Message.findOne({ contactId: contact._id }).sort({ createdAt: -1 }).lean()

      return {
        contact: {
          id: contact._id.toString(),
          workspace_id: contact.workspaceId,
          external_id: contact.externalId,
          channel: contact.channel,
          name: contact.name,
          phone: contact.phone,
          instagram_handle: contact.instagramHandle,
          lifecycle_stage: contact.lifecycleStage,
          tags: contact.tags ?? [],
          bot_active: contact.botActive ?? true,
          dnd: contact.dnd ?? false,
          chat_status: contact.chatStatus ?? 'open',
          attention_required: contact.attentionRequired ?? false,
          notes: contact.notes ?? '',
          created_at: contact.createdAt,
          updated_at: contact.updatedAt,
        },
        messages: [],
        last_message: lastMsg
          ? { id: lastMsg._id.toString(), content: lastMsg.content, direction: lastMsg.direction, created_at: lastMsg.createdAt }
          : null,
        unread_count: contact.unread ?? 0,
      }
    }),
  )

  return NextResponse.json({ data: conversations })
}
