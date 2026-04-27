import { createClient as _createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton – reutiliza la misma instancia en toda la app del lado del cliente
let _instance: ReturnType<typeof _createClient> | null = null

export function createClient() {
  if (!_instance) {
    _instance = _createClient(supabaseUrl, supabaseAnon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _instance
}
