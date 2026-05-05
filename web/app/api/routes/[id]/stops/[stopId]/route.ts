import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'

// PATCH /api/routes/[id]/stops/[stopId]  — marcar parada completada/pendiente/skipped
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  try {
    const { clinicId } = await getAuthContext(request)
    const { id: routeId, stopId } = await params
    const body = await request.json()

    // Verify route belongs to clinic
    const { data: route } = await supabaseAdmin
      .from('routes')
      .select('id')
      .eq('id', routeId)
      .eq('clinic_id', clinicId)
      .single()

    if (!route) throw new NotFoundError('Route', routeId)

    const allowed: Record<string, unknown> = {}
    if (typeof body.status === 'string') allowed.status = body.status
    if (body.arrived_at !== undefined)   allowed.arrived_at = body.arrived_at
    if (typeof body.notes === 'string')  allowed.notes  = body.notes

    const { data, error } = await supabaseAdmin
      .from('route_stops')
      .update(allowed)
      .eq('id', stopId)
      .eq('route_id', routeId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('RouteStop', stopId)
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
