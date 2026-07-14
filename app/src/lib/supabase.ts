import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Server-only Supabase client. Never import this module from a client component. */

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  const serverSecret = process.env.AUTH_SECRET
  const key = serviceKey || publishableKey

  if (!url || !key || (!serviceKey && !serverSecret)) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_PUBLISHABLE_KEY with AUTH_SECRET.',
    )
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: serviceKey ? undefined : { headers: { 'x-zenno-server-secret': serverSecret! } },
  })
  return _client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (process.env.SUPABASE_PUBLISHABLE_KEY && process.env.AUTH_SECRET)),
  )
}
