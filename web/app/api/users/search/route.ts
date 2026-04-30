import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const q = new URL(request.url).searchParams.get('q')

    if (!q || q.trim().length < 2) throw new ValidationError('q must be at least 2 characters')

    const term = q.trim()
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*, pets (id, name, type)')
      .eq('clinic_id', clinicId)
      .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
      .order('name', { ascending: true })
      .limit(20)

    if (error) handleSupabaseError(error)
    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}
