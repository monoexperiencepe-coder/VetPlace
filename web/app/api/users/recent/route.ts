import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, email, created_at, pets (id, name, type)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) handleSupabaseError(error)
    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}
