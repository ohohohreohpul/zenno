import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContact, updateContact } from '@/lib/queries'
import { triggerCampaignsForStage } from '@/lib/campaign-runner'
import { requestWorkspaceId } from '@/lib/request-context'

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

  const previous = await getContact(id) as unknown as { lifecycleStage?: string; workspaceId?: string } | null
  if (!previous || previous.workspaceId !== requestWorkspaceId(req)) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }
  const updated = await updateContact(id, parsed.data) as unknown as { id: string; workspaceId: string; lifecycleStage: string; name: string | null; channel: string } | null
  if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  await fireStageCampaigns(previous?.lifecycleStage, updated.lifecycleStage, {
    workspaceId: updated.workspaceId, id: updated.id, name: updated.name, channel: updated.channel,
  })
  return NextResponse.json({ data: updated })
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
