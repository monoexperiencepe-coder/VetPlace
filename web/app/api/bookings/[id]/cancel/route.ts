import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { cancelBooking } from '@/lib/services/bookingService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const booking = await cancelBooking(id, clinicId)
    return ok(booking)
  } catch (e) {
    return handleRouteError(e)
  }
}
