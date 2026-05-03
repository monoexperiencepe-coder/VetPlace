import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// GET /api/payments/pending
// Bookings completed in the last 7 days with no payment registered
export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

    // Get all payment booking_ids so we can exclude them
    const { data: paid } = await supabaseAdmin
      .from('payments').select('booking_id')
      .eq('clinic_id', clinicId).not('booking_id', 'is', null)
    const paidIds = (paid ?? []).map(p => p.booking_id).filter(Boolean)

    let query = supabaseAdmin
      .from('bookings')
      .select('id, date, time, price, notes, pet:pets(id, name, type, default_price, user:clients(id, name, phone))')
      .eq('clinic_id', clinicId)
      .eq('status', 'COMPLETED')
      .gte('date', since)
      .order('date', { ascending: false })

    if (paidIds.length > 0)
      query = query.not('id', 'in', `(${paidIds.join(',')})`)

    const { data, error } = await query
    if (error) handleSupabaseError(error)
    return ok(data ?? [])
  } catch (e) { return handleRouteError(e) }
}
