import { createClient as _createClient } from '@supabase/supabase-js'

/**
 * Create a public Supabase client (anon key, respects RLS)
 * Use in client-side code or server components that don't need bypass.
 */
export function createClient(url: string, anonKey: string) {
  return _createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
}

/**
 * Create an admin Supabase client (service_role key, bypasses RLS)
 * Use ONLY in API routes / server-side code. Never expose to the client.
 */
export function createAdminClient(url: string, serviceRoleKey: string) {
  return _createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
