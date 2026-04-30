import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone: rawEncoded } = await params
    const raw = decodeURIComponent(rawEncoded)
    const normalized = raw.startsWith('+') ? raw : `+51${raw}`
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*, pets (id, name, type)')
      .eq('clinic_id', clinicId)
      .or(`phone.eq.${raw},phone.eq.${normalized}`)
      .maybeSingle()

    if (error) handleSupabaseError(error)
    return ok(data ?? null)
  } catch (e) {
    return handleRouteError(e)
  }
}
