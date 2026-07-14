import { NextRequest, NextResponse } from 'next/server'
import { getContacts } from '@/lib/queries'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'

  const contacts = await getContacts(workspaceId) as unknown as Array<Record<string, unknown>>
  const data = contacts.map((c) => ({
      id: c.id,
      workspace_id: c.workspaceId,
      external_id: c.externalId,
      channel: c.channel,
      name: c.name,
      phone: c.phone,
      instagram_handle: c.instagramHandle ?? null,
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
