// Idempotent Supabase demo seed.
// NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
import { createClient } from '@supabase/supabase-js'
import { randomBytes, scryptSync } from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`) }
const upsert = async (table, rows, onConflict = 'id') => {
  const { error } = await db.from(table).upsert(rows, { onConflict })
  fail(table, error)
}
const hashPassword = (password) => {
  const salt = randomBytes(16)
  return `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`
}
const future = (days, hour, minute = 0) => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, minute, 0, 0); return d.toISOString()
}

await upsert('agencies', [{ id: 'agency-1', name: 'Zen Studio Agency', slug: 'zen-studio', owner_id: 'user-demo-1', brand_color: '#1A1714', credits: 450, plan: 'starter' }])
await upsert('users', [{ id: 'user-demo-1', email: 'demo@studio.com', password_hash: hashPassword('demo1234'), name: 'Demo Owner', role: 'owner', agency_id: 'agency-1' }])
await upsert('workspaces', [
  { id: 'ws-1', name: 'Lotus Yoga Bangkok', slug: 'lotus-yoga', agency_id: 'agency-1' },
  { id: 'ws-2', name: 'Serene Spa Sukhumvit', slug: 'serene-spa', agency_id: 'agency-1' },
])

const contacts = [
  { id: 'contact-1', workspace_id: 'ws-1', external_id: '66812345678', channel: 'whatsapp', name: 'Mia Tanaka', phone: '+66812345678', lifecycle_stage: 'inquiry', tags: ['yoga','trial'], unread: 2 },
  { id: 'contact-2', workspace_id: 'ws-1', external_id: '66823456789', channel: 'whatsapp', name: 'Lena Hoffmann', phone: '+66823456789', lifecycle_stage: 'qualified', tags: ['spa','vip'], attention_required: true, unread: 1, notes: 'Wants to start monthly unlimited this week.' },
  { id: 'contact-3', workspace_id: 'ws-1', external_id: 'ig_sarahloves', channel: 'instagram', name: 'Sarah Chen', instagram_handle: 'sarahloves', lifecycle_stage: 'trial_booked', tags: ['inquiry'], bot_active: false },
  { id: 'contact-4', workspace_id: 'ws-1', external_id: 'line_kk2024', channel: 'line', name: 'Koko Watanabe', lifecycle_stage: 'attended', tags: ['lead'], bot_active: false, chat_status: 'closed', notes: 'Prefers Thai language.' },
  { id: 'contact-5', workspace_id: 'ws-1', external_id: '66834567890', channel: 'whatsapp', name: 'Priya Nair', phone: '+66834567890', lifecycle_stage: 'rebooked', tags: ['retreat'], dnd: true, chat_status: 'closed' },
]
await upsert('contacts', contacts)

await upsert('messages', [
  { id: 'msg-1', workspace_id: 'ws-1', contact_id: 'contact-1', channel: 'whatsapp', direction: 'inbound', content: 'Hi! What classes do you have?', ai_generated: false },
  { id: 'msg-2', workspace_id: 'ws-1', contact_id: 'contact-1', channel: 'whatsapp', direction: 'outbound', content: 'Hi Mia! We have Morning Flow, Evening Yin, and weekend workshops. Would you like a free trial?', ai_generated: true },
  { id: 'msg-3', workspace_id: 'ws-1', contact_id: 'contact-2', channel: 'whatsapp', direction: 'inbound', content: 'Do you offer monthly memberships?', ai_generated: false },
  { id: 'msg-4', workspace_id: 'ws-1', contact_id: 'contact-2', channel: 'whatsapp', direction: 'outbound', content: 'Yes—monthly unlimited is 2,500 THB. Would you like to start this week?', ai_generated: true },
])

await upsert('schedule_slots', [
  { id: 'slot-1', workspace_id: 'ws-1', class_name: 'Morning Flow', day_of_week: 1, time: '07:00', duration_min: 60, capacity: 14, booked: 9, instructor: 'Nok' },
  { id: 'slot-2', workspace_id: 'ws-1', class_name: 'Morning Flow', day_of_week: 3, time: '09:00', duration_min: 60, capacity: 14, booked: 6, instructor: 'Ploy' },
  { id: 'slot-3', workspace_id: 'ws-1', class_name: 'Evening Yin', day_of_week: 4, time: '18:30', duration_min: 75, capacity: 12, booked: 5, instructor: 'Mali' },
  { id: 'slot-4', workspace_id: 'ws-1', class_name: 'Weekend Workshop', day_of_week: 6, time: '10:00', duration_min: 120, capacity: 20, booked: 12, instructor: 'Mali' },
])
await upsert('appointments', [
  { id: 'appt-1', workspace_id: 'ws-1', contact_id: 'contact-3', contact_name: 'Sarah Chen', class_name: 'Morning Flow (Trial)', starts_at: future(1, 9), duration_min: 60, channel: 'instagram', kind: 'trial' },
])
await upsert('deals', [
  { id: 'deal-1', workspace_id: 'ws-1', contact_id: 'contact-1', contact_name: 'Mia Tanaka', name: 'Yoga Package 10x', value: 4500, currency: 'THB', stage: 'lead', channel: 'whatsapp' },
  { id: 'deal-2', workspace_id: 'ws-1', contact_id: 'contact-2', contact_name: 'Lena Hoffmann', name: 'Monthly Unlimited', value: 2500, currency: 'THB', stage: 'qualified', channel: 'whatsapp' },
])
await upsert('tasks', [{ id: 'task-1', workspace_id: 'ws-1', contact_id: 'contact-2', title: 'Confirm membership payment', contact_name: 'Lena Hoffmann', priority: 'high', status: 'todo', due_date: future(1, 12) }])
await upsert('campaigns', [{ id: 'campaign-1', workspace_id: 'ws-1', name: 'Trial follow-up', status: 'active', trigger_stage: 'trial_booked', goal: 'Help the customer confirm and attend their trial class.', flow: [] }])
await upsert('comment_automations', [{ id: 'automation-1', workspace_id: 'ws-1', keyword: 'CLASS', post_label: 'Morning Flow reel', opening_dm: 'Hi {{name}}! Want me to book you a free trial?', status: 'active' }])
await upsert('workspace_ai_configs', [{
  id: 'ai-config-1', workspace_id: 'ws-1',
  system_prompt: 'You are the 24/7 receptionist and sales assistant for Lotus Yoga Bangkok. Answer accurately, qualify interest, and help customers book. Keep replies concise and use the customer\'s language. Escalate refunds, complaints, medical questions, and payment problems to a human.',
  knowledge_summary: 'Business: Lotus Yoga Bangkok. Location: Sukhumvit Soi 23, Bangkok. Classes: Morning Flow at 7am and 9am, Evening Yin at 6:30pm, Weekend Workshop Saturday at 10am. Pricing: drop-in 450 THB, 10-class pack 1,800 THB, monthly unlimited 2,500 THB. First-time visitors receive one free trial class.',
  guardrails: { alwaysEscalateTopics: ['refunds','complaints','medical advice','payment disputes'], maxDiscountPercent: 0, businessHoursOnly: false },
}], 'workspace_id')

console.log('Seeded Supabase demo workspace ws-1 (demo@studio.com / demo1234).')
