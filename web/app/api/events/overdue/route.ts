import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('events')
      .select(`id, type, scheduled_date, pet:pets (id, name, user:clients (id, name, phone))`)
      .eq('clinic_id', clinicId)
      .lt('scheduled_date', today)
      .eq('status', 'PENDING')
      .order('scheduled_date', { ascending: true })

    if (error) handleSupabaseError(error)
    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}
