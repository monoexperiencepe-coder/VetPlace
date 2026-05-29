import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { getBookingById } from '@/lib/services/bookingService'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const booking = await getBookingById(id, clinicId)
    return ok(booking)
  } catch (e) {
    return handleRouteError(e)
  }
}

// PATCH /api/bookings/[id] — update staff_id (and optionally notes/price)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json()

    const allowed: Record<string, unknown> = {}
    if ('staff_id' in body)  allowed.staff_id = body.staff_id
    if ('notes'    in body)  allowed.notes    = body.notes
    if ('price'    in body)  allowed.price    = body.price

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ ...allowed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) return handleRouteError(error)
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
