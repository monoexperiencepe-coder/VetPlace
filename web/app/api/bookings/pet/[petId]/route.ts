import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { getBookingsByPet } from '@/lib/services/bookingService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const { petId } = await params
    const { clinicId } = await getAuthContext(request)
    const bookings = await getBookingsByPet(petId, clinicId)
    return ok(bookings)
  } catch (e) {
    return handleRouteError(e)
  }
}
