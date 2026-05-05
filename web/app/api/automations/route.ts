import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('automations')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}
