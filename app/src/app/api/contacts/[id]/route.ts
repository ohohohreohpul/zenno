import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { IS_MOCK, MockDB } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Contact } from '@/models/Contact'
import { serializeDoc } from '@/lib/serialize'
import { triggerCampaignsForStage } from '@/lib/campaign-runner'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  botActive: z.boolean().optional(),
  dnd: z.boolean().optional(),
  chatStatus: z.enum(['open', 'closed']).optional(),
  attentionRequired: z.boolean().optional(),
  lifecycleStage: z.string().min(1).optional(),
  notes: z.string().max(4000).optional(),
  unread: z.number().int().min(0).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  if (IS_MOCK) {
    const previous = MockDB.getContact(id)
    const updated = MockDB.updateContact(id, parsed.data)
    if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    await fireStageCampaigns(previous?.lifecycleStage, updated.lifecycleStage, {
      workspaceId: updated.workspaceId, id: updated._id, name: updated.name, channel: updated.channel,
    })
    return NextResponse.json({ data: updated })
  }

  await connectDb()
  const previous = await Contact.findById(id).lean()
  const updated = await Contact.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean()
  if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  await fireStageCampaigns(previous?.lifecycleStage, updated.lifecycleStage, {
    workspaceId: updated.workspaceId, id: updated._id.toString(), name: updated.name, channel: updated.channel,
  })
  return NextResponse.json({ data: serializeDoc(updated) })
}

interface StageChangeContact {
  workspaceId: string
  id: string
  name: string | null
  channel: string
}

async function fireStageCampaigns(
  previousStage: string | undefined,
  newStage: string,
  contact: StageChangeContact,
): Promise<void> {
  if (!previousStage || previousStage === newStage) return
  try {
    await triggerCampaignsForStage(contact.workspaceId, { id: contact.id, name: contact.name, channel: contact.channel }, newStage)
  } catch {
    // Campaign auto-fire must never block the contact update itself.
  }
}
