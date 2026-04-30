import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const q = new URL(request.url).searchParams.get('q')

    if (!q || q.trim().length < 1) throw new ValidationError('q is required')

    const term = q.trim()
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('id, name, type, breed, birth_date, grooming_frequency_days, user_id, client:clients (id, name, phone, email, created_at)')
      .eq('clinic_id', clinicId)
      .ilike('name', `%${term}%`)
      .order('name', { ascending: true })
      .limit(20)

    if (error) handleSupabaseError(error)
    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}
