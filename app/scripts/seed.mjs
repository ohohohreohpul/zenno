// Idempotent production bootstrap.
// Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.
import { createClient } from '@supabase/supabase-js'
import { randomBytes, scryptSync } from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL?.toLowerCase()
const password = process.env.ADMIN_PASSWORD
const businessName = process.env.BUSINESS_NAME || 'My Business'

if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
if (!email || !password || password.length < 12) throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters')

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`) }
const upsert = async (table, rows, onConflict = 'id') => {
  const { error } = await db.from(table).upsert(rows, { onConflict })
  fail(table, error)
}
const hashPassword = (value) => {
  const salt = randomBytes(16)
  return `${salt.toString('hex')}:${scryptSync(value, salt, 64).toString('hex')}`
}

await upsert('agencies', [{
  id: 'agency-1', name: 'Zenno', slug: 'zenno', owner_id: 'user-owner-1',
  brand_color: '#1A1714', credits: 450, plan: 'starter',
}])
await upsert('users', [{
  id: 'user-owner-1', email, password_hash: hashPassword(password),
  name: 'Zenno Owner', role: 'owner', agency_id: 'agency-1',
}])
await upsert('workspaces', [{
  id: 'ws-1', name: businessName, slug: 'primary-business', agency_id: 'agency-1',
}])
await upsert('workspace_ai_configs', [{
  id: 'ai-config-1', workspace_id: 'ws-1',
  system_prompt: 'You are the 24/7 receptionist and sales assistant for this business. Answer only from verified business information, qualify interest, help customers take the next step, and escalate sensitive matters to a human.',
  knowledge_summary: '',
  guardrails: {
    alwaysEscalateTopics: ['refunds', 'complaints', 'medical advice', 'payment disputes'],
    maxDiscountPercent: 0,
    businessHoursOnly: false,
  },
}], 'workspace_id')

console.log(`Production workspace ready for ${email}. Complete Setup before connecting customer channels.`)
