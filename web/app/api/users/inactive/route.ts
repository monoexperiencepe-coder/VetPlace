import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// GET /api/users/inactive?days=30
// Returns clients whose pets have had no booking in the last N days
export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const sp   = new URL(request.url).searchParams
    const days = Math.max(1, parseInt(sp.get('days') ?? '30', 10))

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)

    // 1. Pet IDs that have a recent booking
    const { data: recentBookings, error: e1 } = await supabaseAdmin
      .from('bookings')
      .select('pet_id')
      .eq('clinic_id', clinicId)
      .gte('date', cutoff)

    if (e1) handleSupabaseError(e1)

    const activePetIds = [...new Set((recentBookings ?? []).map(b => b.pet_id))]

    // 2. Client IDs whose pets are active
    let activeClientIds: string[] = []
    if (activePetIds.length > 0) {
      const { data: activePets, error: e2 } = await supabaseAdmin
        .from('pets')
        .select('user_id')
        .in('id', activePetIds)
        .eq('clinic_id', clinicId)

      if (e2) handleSupabaseError(e2)
      activeClientIds = [...new Set(
        (activePets ?? []).map(p => p.user_id).filter(Boolean) as string[]
      )]
    }

    // 3. Clients NOT in active set (with their pets)
    let query = supabaseAdmin
      .from('clients')
      .select('id, name, phone, created_at, pets (id, name, type)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })
      .limit(15)

    if (activeClientIds.length > 0) {
      query = query.not('id', 'in', `(${activeClientIds.join(',')})`)
    }

    const { data, error: e3 } = await query
    if (e3) handleSupabaseError(e3)

    // Only return clients who have at least one pet (new clients with no pets are not "inactive")
    const inactive = (data ?? []).filter(
      (c: { pets?: unknown[] }) => Array.isArray(c.pets) && c.pets.length > 0
    )

    return ok(inactive)
  } catch (e) {
    return handleRouteError(e)
  }
}
