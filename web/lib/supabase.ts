import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// createBrowserClient de @supabase/ssr sincroniza la sesión en cookies
// automáticamente, lo que permite que el middleware de Next.js las lea.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnon)
}
