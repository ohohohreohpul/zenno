import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client. Uses the service role key which bypasses RLS —
 * safe for server-side API routes and lib functions, never exposed to the browser.
 *
 * In mock mode (MOCK_MODE=true) this client is never used; MockDB handles everything.
 */

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run in MOCK_MODE=true.',
    )
  }

  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}
