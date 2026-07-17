/* eslint-disable @typescript-eslint/no-explicit-any */
import { IS_MOCK, MockDB } from './mock-store'
import { getSupabase, isSupabaseConfigured } from './supabase'

/**
 * Unified data-access layer. Every function checks IS_MOCK and routes to
 * MockDB (dev) or Supabase (prod). API routes and lib files call these
 * instead of importing mongoose models — no more `connectDb()` + `Model.find()`.
 */

// ── Row mappers ─────────────────────────────────────────────────────────────

function fromDb(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_(.)/g, (_, c) => c.toUpperCase())] = v
  }
  return out
}

function fromDbArr(rows: Record<string, unknown>[] | null): Record<string, unknown>[] {
  return (rows ?? []).map((r) => fromDb(r) as Record<string, unknown>)
}

function toDb(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (k === 'id' || k === '_id') continue // never insert id
    out[k.replace(/[A-Z]/g, (m, i) => (i === 0 ? m.toLowerCase() : `_${m.toLowerCase()}`))] = v
  }
  return out
}

function ensureSupa(): ReturnType<typeof getSupabase> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use MOCK_MODE=true.')
  return getSupabase()
}

// ── Agencies ─────────────────────────────────────────────────────────────────

export async function getAgenciesByOwner(ownerId: string) {
  if (IS_MOCK) return MockDB.getWorkspaces(ownerId) // fallback
  const { data, error } = await ensureSupa().from('agencies').select('*').eq('owner_id', ownerId)
  if (error) throw error
  return fromDbArr(data)
}

export async function getAgency(id: string) {
  if (IS_MOCK) {
    const a = MockDB.getAgency(id)
    return a ? { ...a } : null
  }
  const { data, error } = await ensureSupa().from('agencies').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createAgency(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.createAgency(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('agencies').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export async function getWorkspacesByAgency(agencyId: string) {
  if (IS_MOCK) return MockDB.getWorkspaces(agencyId)
  const { data, error } = await ensureSupa().from('workspaces').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function getWorkspace(id: string) {
  if (IS_MOCK) { const row = MockDB.getWorkspace(id); return row ? { ...row, id: row._id } : null }
  const { data, error } = await ensureSupa().from('workspaces').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createWorkspace(data: Record<string, unknown>) {
  if (IS_MOCK) return { id: `ws-${Date.now()}`, ...data }
  const { data: row, error } = await ensureSupa().from('workspaces').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateWorkspace(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) return { id, ...patch }
  const { data, error } = await ensureSupa().from('workspaces').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  if (IS_MOCK) {
    const { LOCAL_USER } = await import('./auth')
    if (email === LOCAL_USER.email) {
      return { id: LOCAL_USER.userId, email, passwordHash: '', name: LOCAL_USER.name, role: 'owner', agencyId: 'agency-1' }
    }
    return null
  }
  const { data, error } = await ensureSupa().from('users').select('*').eq('email', email.toLowerCase()).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function provisionAuthenticatedUser(params: {
  authUserId: string
  email: string
  name: string
  businessName: string
}) {
  if (IS_MOCK) return { agencyId: 'agency-1', workspaceId: 'ws-1', userName: params.name }
  const { data, error } = await ensureSupa().rpc('provision_authenticated_user', {
    auth_user_id_param: params.authUserId,
    email_param: params.email.toLowerCase(),
    name_param: params.name,
    business_name_param: params.businessName,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return fromDb(row as Record<string, unknown> | null)
}

// ── Contacts ────────────────────────────────────────────────────────────────

export async function getContacts(workspaceId: string) {
  if (IS_MOCK) return MockDB.getContacts(workspaceId).map((c) => ({ ...c, id: c._id }))
  const { data, error } = await ensureSupa().from('contacts').select('*').eq('workspace_id', workspaceId).order('updated_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function getContact(id: string) {
  if (IS_MOCK) {
    const c = MockDB.getContact(id)
    return c ? { ...c, id: c._id } : null
  }
  const { data, error } = await ensureSupa().from('contacts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function findContactByExternal(workspaceId: string, externalId: string, channel: string) {
  if (IS_MOCK) {
    const c = MockDB.getContacts(workspaceId).find((item) => item.externalId === externalId && item.channel === channel)
    return c ? { ...c, id: c._id } : null
  }
  const { data, error } = await ensureSupa().from('contacts').select('*')
    .eq('workspace_id', workspaceId).eq('external_id', externalId).eq('channel', channel).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function upsertContact(workspaceId: string, externalId: string, channel: string, patch: Record<string, unknown> = {}) {
  if (IS_MOCK) {
    const existing = MockDB.getContacts(workspaceId).find((c) => c.externalId === externalId && c.channel === channel)
    if (existing) {
      MockDB.updateContact(existing._id, { name: (patch as { name?: string }).name ?? existing.name })
      return { ...MockDB.getContact(existing._id)!, id: existing._id }
    }
    const created = MockDB.createContact({ workspaceId, externalId, channel, ...patch } as any)
    return { ...created, id: created._id }
  }
  const supabase = ensureSupa()
  const { data: existing } = await supabase.from('contacts').select('*').eq('workspace_id', workspaceId).eq('external_id', externalId).eq('channel', channel).maybeSingle()
  if (existing) {
    const { data, error } = await supabase.from('contacts').update(toDb(patch)).eq('id', existing.id).select().single()
    if (error) throw error
    return fromDb(data)
  }
  const { data: row, error } = await supabase.from('contacts').insert({ workspace_id: workspaceId, external_id: externalId, channel, ...toDb(patch) }).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateContact(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) {
    MockDB.updateContact(id, patch as any)
    return MockDB.getContact(id) ? { ...MockDB.getContact(id)!, id } : null
  }
  const { data, error } = await ensureSupa().from('contacts').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function incrementUnread(contactId: string) {
  if (IS_MOCK) {
    const c = MockDB.getContact(contactId)
    if (c) MockDB.updateContact(contactId, { unread: c.unread + 1 })
    return
  }
  // Not perfectly atomic, but unread count is display-only — no critical race.
  const { data } = await ensureSupa().from('contacts').select('unread').eq('id', contactId).maybeSingle()
  if (data) {
    await ensureSupa().from('contacts').update({ unread: (data.unread ?? 0) + 1 }).eq('id', contactId)
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(contactId: string) {
  if (IS_MOCK) return MockDB.getMessages(contactId).map((m) => ({ ...m, id: m._id }))
  const { data, error } = await ensureSupa().from('messages').select('*').eq('contact_id', contactId).order('created_at', { ascending: true })
  if (error) throw error
  return fromDbArr(data)
}

export async function hasInboundMessage(contactId: string): Promise<boolean> {
  if (IS_MOCK) return MockDB.getMessages(contactId).some((m) => m.direction === 'inbound')
  const { data, error } = await ensureSupa().from('messages').select('id')
    .eq('contact_id', contactId).eq('direction', 'inbound').limit(1).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function hasInboundMessageAfter(contactId: string, after: Date | string): Promise<boolean> {
  if (IS_MOCK) return MockDB.getMessages(contactId).some((message) => message.direction === 'inbound' && new Date(message.createdAt).getTime() > new Date(after).getTime())
  const { data, error } = await ensureSupa().from('messages').select('id')
    .eq('contact_id', contactId).eq('direction', 'inbound').gt('created_at', new Date(after).toISOString()).limit(1).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function getRecentMessages(contactId: string, limit = 20) {
  if (IS_MOCK) {
    return MockDB.getMessages(contactId).slice(-limit).map((m) => ({ ...m, id: m._id }))
  }
  const { data, error } = await ensureSupa().from('messages').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return fromDbArr(data).reverse()
}

export async function getLastMessage(contactId: string) {
  if (IS_MOCK) {
    const m = MockDB.getLastMessage(contactId)
    return m ? { ...m, id: m._id } : null
  }
  const { data, error } = await ensureSupa().from('messages').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createMessage(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.addMessage(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('messages').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function getMessageStats(workspaceId: string) {
  if (IS_MOCK) {
    const msgs = MockDB.getAllMessages().filter((m) => m.workspaceId === workspaceId)
    return { total: msgs.length, ai: msgs.filter((m) => m.aiGenerated).length }
  }
  const supabase = ensureSupa()
  const { count: total } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
  const { count: ai } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('ai_generated', true)
  return { total: total ?? 0, ai: ai ?? 0 }
}

// ── Appointments ────────────────────────────────────────────────────────────

export async function getAppointments(workspaceId: string) {
  if (IS_MOCK) return MockDB.getAppointments(workspaceId).map((a) => ({ ...a, id: a._id }))
  const { data, error } = await ensureSupa().from('appointments').select('*').eq('workspace_id', workspaceId).order('starts_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function createAppointment(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.createAppointment(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('appointments').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function getBookedContactIds(workspaceId: string): Promise<Set<string>> {
  if (IS_MOCK) {
    return new Set(MockDB.getAppointments(workspaceId).filter((a) => a.contactId).map((a) => a.contactId!))
  }
  const { data, error } = await ensureSupa().from('appointments').select('contact_id').eq('workspace_id', workspaceId).not('contact_id', 'is', null)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.contact_id as string))
}

// ── Deals ────────────────────────────────────────────────────────────────────

export async function getDeals(workspaceId: string) {
  if (IS_MOCK) return MockDB.getDeals(workspaceId).map((d) => ({ ...d, id: d._id }))
  const { data, error } = await ensureSupa().from('deals').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function getDeal(id: string) {
  if (IS_MOCK) { const row = MockDB.getDeal(id); return row ? { ...row, id: row._id } : null }
  const { data, error } = await ensureSupa().from('deals').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createDeal(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.createDeal(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('deals').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateDeal(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) {
    const d = MockDB.updateDeal(id, patch as any)
    return d ? { ...d, id: d._id } : null
  }
  const { data, error } = await ensureSupa().from('deals').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function deleteDeal(id: string) {
  if (IS_MOCK) { MockDB.deleteDeal(id); return true }
  const { error } = await ensureSupa().from('deals').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function findOpenDealByContact(contactId: string) {
  if (IS_MOCK) return MockDB.findOpenDealByContact(contactId)
  const { data, error } = await ensureSupa()
    .from('deals')
    .select('id, stage, value')
    .eq('contact_id', contactId)
    .not('stage', 'in', '("won","lost")')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? { id: data.id, stage: data.stage, value: data.value } : null
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function getTasks(workspaceId: string) {
  if (IS_MOCK) return MockDB.getTasks(workspaceId).map((t) => ({ ...t, id: t._id }))
  const { data, error } = await ensureSupa().from('tasks').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function getTask(id: string) {
  if (IS_MOCK) {
    const task = MockDB.getTask(id)
    return task ? { ...task, id: task._id } : null
  }
  const { data, error } = await ensureSupa().from('tasks').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createTask(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.createTask(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('tasks').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateTask(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) {
    const t = MockDB.updateTask(id, patch as any)
    return t ? { ...t, id: t._id } : null
  }
  const { data, error } = await ensureSupa().from('tasks').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function deleteTask(id: string) {
  if (IS_MOCK) { MockDB.deleteTask(id); return true }
  const { error } = await ensureSupa().from('tasks').delete().eq('id', id)
  if (error) throw error
  return true
}

// ── Schedule Slots ───────────────────────────────────────────────────────────

export async function getScheduleSlots(workspaceId: string) {
  if (IS_MOCK) return MockDB.getSchedule(workspaceId).map((s) => ({ ...s, id: s._id }))
  const { data, error } = await ensureSupa().from('schedule_slots').select('*').eq('workspace_id', workspaceId)
  if (error) throw error
  return fromDbArr(data)
}

export async function getScheduleSlot(id: string) {
  if (IS_MOCK) {
    const s = MockDB.getScheduleSlot(id)
    return s ? { ...s, id: s._id } : null
  }
  const { data, error } = await ensureSupa().from('schedule_slots').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createScheduleSlot(data: Record<string, unknown>) {
  if (IS_MOCK) return { id: `slot-${Date.now()}`, ...data }
  const { data: row, error } = await ensureSupa().from('schedule_slots').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function deleteScheduleSlot(id: string) {
  if (IS_MOCK) return true
  const { error } = await ensureSupa().from('schedule_slots').delete().eq('id', id)
  if (error) throw error
  return true
}

export async function bookScheduleSlot(params: {
  slotId: string
  startsAt: Date
  contactId: string
  contactName: string
  channel: string
  kind: string
}) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().rpc('book_schedule_slot', {
    slot_id_param: params.slotId,
    starts_at_param: params.startsAt.toISOString(),
    contact_id_param: params.contactId,
    contact_name_param: params.contactName,
    channel_param: params.channel,
    kind_param: params.kind,
  })
  if (error) throw error
  return fromDb(data as Record<string, unknown> | null)
}

export async function incrementSlotBooking(id: string) {
  if (IS_MOCK) {
    const s = MockDB.incrementSlotBooking(id)
    return s ? { ...s, id: s._id } : null
  }
  // Atomic conditional increment — prevents overbooking races.
  const supabase = ensureSupa()
  const { data: slot } = await supabase.from('schedule_slots').select('booked, capacity').eq('id', id).maybeSingle()
  if (!slot || slot.booked >= slot.capacity) return null
  const { data, error } = await supabase.rpc('increment_slot_booking', { slot_id: id, expected_booked: slot.booked })
  if (error) {
    // Fallback: direct update if RPC doesn't exist
    const { data: row, error: err2 } = await supabase.from('schedule_slots').update({ booked: slot.booked + 1 }).eq('id', id).eq('booked', slot.booked).select().maybeSingle()
    if (err2) throw err2
    return fromDb(row)
  }
  return fromDb(data as Record<string, unknown>)
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaigns(workspaceId: string) {
  if (IS_MOCK) return MockDB.getCampaigns(workspaceId).map((c) => ({ ...c, id: c._id }))
  const { data, error } = await ensureSupa().from('campaigns').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function getCampaign(id: string) {
  if (IS_MOCK) {
    const c = MockDB.getCampaign(id)
    return c ? { ...c, id: c._id } : null
  }
  const { data, error } = await ensureSupa().from('campaigns').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createCampaign(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.createCampaign(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('campaigns').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateCampaign(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) {
    const c = MockDB.updateCampaign(id, patch as any)
    return c ? { ...c, id: c._id } : null
  }
  const { data, error } = await ensureSupa().from('campaigns').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

// ── Campaign Enrollments ──────────────────────────────────────────────────────

export async function getEnrollment(campaignId: string, contactId: string) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('campaign_enrollments').select('*').eq('campaign_id', campaignId).eq('contact_id', contactId).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function enqueueCampaignEnrollment(
  campaignId: string,
  contactId: string,
  messageContent?: string,
  runId?: string | null,
): Promise<{ created: boolean; enrollment: Record<string, unknown> | null }> {
  if (IS_MOCK) return { created: true, enrollment: { id: `enrollment-${campaignId}-${contactId}`, campaignId, runId, contactId, deliveryStatus: 'queued', messageContent } }
  const { data, error } = await ensureSupa().from('campaign_enrollments').insert({
    campaign_id: campaignId,
    run_id: runId ?? null,
    contact_id: contactId,
    status: 'active',
    delivery_status: 'queued',
    next_run_at: new Date().toISOString(),
    message_content: messageContent || null,
  }).select().single()
  if (error?.code === '23505') {
    return { created: false, enrollment: await getEnrollment(campaignId, contactId) }
  }
  if (error) throw error
  return { created: true, enrollment: fromDb(data) }
}

export async function claimCampaignEnrollments(batchSize = 1) {
  if (IS_MOCK) return []
  const { data, error } = await ensureSupa().rpc('claim_campaign_enrollments', {
    batch_size_param: Math.max(1, Math.min(batchSize, 10)),
  })
  if (error) throw error
  return fromDbArr(data as Record<string, unknown>[] | null)
}

export async function getCampaignDeliveryStats(campaignId: string) {
  if (IS_MOCK) return { queued: 0, sending: 0, retry: 0, delivered: 0, failed: 0, skipped: 0 }
  const { data, error } = await ensureSupa().from('campaign_enrollments').select('delivery_status').eq('campaign_id', campaignId)
  if (error) throw error
  const counts = { queued: 0, sending: 0, retry: 0, delivered: 0, failed: 0, skipped: 0 }
  for (const row of data ?? []) {
    const status = row.delivery_status as keyof typeof counts
    if (status in counts) counts[status] += 1
  }
  return counts
}

export async function getCampaignRunDeliveryStats(runId: string) {
  if (IS_MOCK) return { queued: 0, sending: 0, retry: 0, delivered: 0, failed: 0, skipped: 0 }
  const { data, error } = await ensureSupa().from('campaign_enrollments').select('delivery_status').eq('run_id', runId)
  if (error) throw error
  const counts = { queued: 0, sending: 0, retry: 0, delivered: 0, failed: 0, skipped: 0 }
  for (const row of data ?? []) {
    const status = row.delivery_status as keyof typeof counts
    if (status in counts) counts[status] += 1
  }
  return counts
}

export async function createCampaignRun(campaignId: string) {
  if (IS_MOCK) return { id: `run-${Date.now()}`, campaignId, status: 'queued' }
  const { data, error } = await ensureSupa().from('campaign_runs').insert({ campaign_id: campaignId, status: 'queued' }).select().single()
  if (error) throw error
  return fromDb(data) as Record<string, unknown>
}

export async function getActiveCampaignRun(campaignId: string) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('campaign_runs').select('*').eq('campaign_id', campaignId)
    .in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function updateCampaignRun(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) return { id, ...patch }
  const { data, error } = await ensureSupa().from('campaign_runs').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function findCampaignAudience(workspaceId: string, audience: {
  stages?: string[]
  tags?: string[]
  inactiveDays?: number | null
  lostOnly?: boolean
  contactIds?: string[]
}) {
  if (IS_MOCK) {
    const contacts = MockDB.getContacts(workspaceId)
    return contacts.filter((contact) => !contact.dnd).map((contact) => ({ ...contact, id: contact._id }))
  }
  const { data, error } = await ensureSupa().rpc('find_campaign_audience', {
    workspace_id_param: workspaceId,
    stages_param: audience.stages ?? [],
    tags_param: audience.tags ?? [],
    inactive_days_param: audience.inactiveDays ?? null,
    lost_only_param: audience.lostOnly ?? false,
    contact_ids_param: audience.contactIds ?? [],
  })
  if (error) throw error
  return fromDbArr(data as Record<string, unknown>[] | null)
}

export async function getEnrollmentById(id: string) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('campaign_enrollments').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function upsertEnrollment(campaignId: string, contactId: string, stepIndex: number, status: string) {
  if (IS_MOCK) return null
  const supabase = ensureSupa()
  const { data: existing } = await supabase.from('campaign_enrollments').select('id').eq('campaign_id', campaignId).eq('contact_id', contactId).maybeSingle()
  if (existing) {
    const { data, error } = await supabase.from('campaign_enrollments').update({ step_index: stepIndex, status, enrolled_at: new Date().toISOString() }).eq('id', existing.id).select().single()
    if (error) throw error
    return fromDb(data)
  }
  const { data: row, error } = await supabase.from('campaign_enrollments').insert({ campaign_id: campaignId, contact_id: contactId, step_index: stepIndex, status, enrolled_at: new Date().toISOString() }).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateEnrollment(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('campaign_enrollments').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

// ── Channel Connections ──────────────────────────────────────────────────────

export async function getChannelConnection(workspaceId: string, channel: string) {
  if (IS_MOCK) return MockDB.getChannelConnection(workspaceId, channel)
  const { data, error } = await ensureSupa().from('channel_connections').select('*').eq('workspace_id', workspaceId).eq('channel', channel).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function getChannelConnectionByInstance(instanceName: string) {
  if (IS_MOCK) return MockDB.getChannelConnectionByInstance(instanceName)
  const { data, error } = await ensureSupa().from('channel_connections').select('*').eq('instance_name', instanceName).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function getChannelConnectionByPageId(pageId: string, channel = 'messenger') {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('channel_connections').select('*')
    .eq('channel', channel).eq('status', 'connected').eq('credentials->>pageId', pageId).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function getChannelConnectionByVerifyToken(verifyToken: string, channel: string) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('channel_connections').select('*')
    .eq('channel', channel).eq('status', 'connected').eq('credentials->>verifyToken', verifyToken).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createChannelConnection(data: Record<string, unknown>) {
  if (IS_MOCK) return MockDB.createChannelConnection(data as any)
  const { data: row, error } = await ensureSupa().from('channel_connections').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateChannelConnection(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) return MockDB.updateChannelConnection(id, patch as any)
  const { data, error } = await ensureSupa().from('channel_connections').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function upsertChannelConnection(workspaceId: string, channel: string, patch: Record<string, unknown>) {
  const existing = await getChannelConnection(workspaceId, channel) as { id?: string; credentials?: Record<string, unknown> } | null
  const merged = patch.credentials
    ? { ...patch, credentials: { ...(existing?.credentials ?? {}), ...(patch.credentials as Record<string, unknown>) } }
    : patch
  if (existing?.id) return updateChannelConnection(existing.id, merged)
  return createChannelConnection({ workspaceId, channel, ...merged })
}

export async function reserveChannelSend(
  id: string,
  today: string,
  messageCap: number,
  isNewContact: boolean,
  newContactCap: number,
): Promise<boolean> {
  if (IS_MOCK) return true
  const { data, error } = await ensureSupa().rpc('reserve_channel_send', {
    connection_id_param: id,
    send_date_param: today,
    message_cap_param: messageCap,
    is_new_contact_param: isNewContact,
    new_contact_cap_param: newContactCap,
  })
  if (error) throw error
  return data === true
}

export async function findChannelConnectionByEmbedKey(embedKey: string) {
  if (IS_MOCK) return MockDB.findChannelConnectionByEmbedKey(embedKey)
  const { data, error } = await ensureSupa().from('channel_connections').select('*').eq('credentials->>embedKey', embedKey).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

// ── Comment Automations ──────────────────────────────────────────────────────

export async function getCommentAutomations(workspaceId: string) {
  if (IS_MOCK) return MockDB.getCommentAutomations(workspaceId).map((a) => ({ ...a, id: a._id }))
  const { data, error } = await ensureSupa().from('comment_automations').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
  if (error) throw error
  return fromDbArr(data)
}

export async function getCommentAutomation(id: string) {
  if (IS_MOCK) {
    const item = MockDB.getCommentAutomations('ws-1').find((automation) => automation._id === id)
    return item ? { ...item, id: item._id } : null
  }
  const { data, error } = await ensureSupa().from('comment_automations').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createCommentAutomation(data: Record<string, unknown>) {
  if (IS_MOCK) { const row = MockDB.createCommentAutomation(data as any); return { ...row, id: row._id } }
  const { data: row, error } = await ensureSupa().from('comment_automations').insert(toDb(data)).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function updateCommentAutomation(id: string, patch: Record<string, unknown>) {
  if (IS_MOCK) {
    const a = MockDB.updateCommentAutomation(id, patch as any)
    return a ? { ...a, id: a._id } : null
  }
  const { data, error } = await ensureSupa().from('comment_automations').update(toDb(patch)).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}

// ── Workspace AI Config ───────────────────────────────────────────────────────

export async function getAiConfig(workspaceId: string) {
  if (IS_MOCK) {
    return {
      workspaceId,
      systemPrompt: MockDB.getSystemPrompt(workspaceId),
      guardrails: MockDB.getGuardrails(workspaceId),
    }
  }
  const { data, error } = await ensureSupa().from('workspace_ai_configs').select('*').eq('workspace_id', workspaceId).maybeSingle()
  if (error) throw error
  return fromDb(data) ?? { workspaceId, systemPrompt: '', knowledgeSummary: '', guardrails: { alwaysEscalateTopics: [], maxDiscountPercent: null, businessHoursOnly: false } }
}

export async function upsertAiConfig(workspaceId: string, patch: Record<string, unknown>) {
  if (IS_MOCK) {
    if (patch.systemPrompt !== undefined) MockDB.setSystemPrompt(workspaceId, patch.systemPrompt as string)
    if (patch.guardrails) MockDB.setGuardrails(workspaceId, patch.guardrails as any)
    return { workspaceId, ...patch }
  }
  const supabase = ensureSupa()
  const dbPatch = toDb(patch)
  // Convert guardrails to jsonb if present
  if (patch.guardrails) dbPatch.guardrails = patch.guardrails

  const { data: existing } = await supabase.from('workspace_ai_configs').select('id').eq('workspace_id', workspaceId).maybeSingle()
  if (existing) {
    const { data, error } = await supabase.from('workspace_ai_configs').update(dbPatch).eq('id', existing.id).select().single()
    if (error) throw error
    return fromDb(data)
  }
  const { data: row, error } = await supabase.from('workspace_ai_configs').insert({ workspace_id: workspaceId, ...dbPatch }).select().single()
  if (error) throw error
  return fromDb(row)
}

// ── Credits ───────────────────────────────────────────────────────────────────

export async function getAgencyBalance(agencyId: string): Promise<number> {
  if (IS_MOCK) return MockDB.getAgency(agencyId)?.credits ?? 0
  const { data, error } = await ensureSupa().from('agencies').select('credits').eq('id', agencyId).maybeSingle()
  if (error) throw error
  return data?.credits ?? 0
}

export async function spendCredits(agencyId: string, cost: number, reason: string, refId?: string): Promise<{ ok: boolean; balance: number }> {
  if (IS_MOCK) {
    const agency = MockDB.getAgency(agencyId)
    if (!agency || agency.credits < cost) return { ok: false, balance: agency?.credits ?? 0 }
    const newBalance = agency.credits - cost
    MockDB.updateAgency(agencyId, { credits: newBalance })
    return { ok: true, balance: newBalance }
  }
  const supabase = ensureSupa()
  // Atomic decrement with CHECK constraint prevents going negative.
  const { data, error } = await supabase.rpc('spend_credits', { agency_id_param: agencyId, cost_param: cost })
  if (error) throw error
  const result = data as { ok: boolean; balance: number } | null
  if (!result) return { ok: false, balance: 0 }
  // Log to ledger
  await supabase.from('credit_ledger').insert({ agency_id: agencyId, delta: -cost, reason, ref_id: refId ?? null, balance: result.balance })
  return result
}

export async function addCredits(agencyId: string, amount: number, reason: string, refId?: string): Promise<number> {
  if (IS_MOCK) {
    const agency = MockDB.getAgency(agencyId)
    if (!agency) throw new Error(`Agency not found: ${agencyId}`)
    const newBalance = agency.credits + amount
    agency.credits = newBalance
    return newBalance
  }
  const supabase = ensureSupa()
  const { data, error } = await supabase.rpc('add_credits', { agency_id_param: agencyId, amount_param: amount })
  if (error) throw error
  const balance = (data as number) ?? 0
  await supabase.from('credit_ledger').insert({ agency_id: agencyId, delta: amount, reason, ref_id: refId ?? null, balance })
  return balance
}

// ── Stripe Events ────────────────────────────────────────────────────────────

export async function getStripeEvent(id: string) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('stripe_events').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return fromDb(data)
}

export async function createStripeEvent(data: Record<string, unknown>) {
  if (IS_MOCK) return data
  const { data: row, error } = await ensureSupa().from('stripe_events').insert(data).select().single()
  if (error) throw error
  return fromDb(row)
}

export async function markStripeEventProcessed(id: string) {
  if (IS_MOCK) return null
  const { data, error } = await ensureSupa().from('stripe_events').update({ processed: true }).eq('id', id).select().maybeSingle()
  if (error) throw error
  return fromDb(data)
}
