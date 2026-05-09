import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { createBooking, getBookingsByDate, getAllBookings } from '@/lib/services/bookingService'

export const dynamic = 'force-dynamic'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const params = new URL(request.url).searchParams
    const date   = params.get('date')
    const all    = params.get('all')

    if (all === 'true') {
      const bookings = await getAllBookings(clinicId)
      return ok(bookings)
    }

    if (!date) throw new ValidationError('query param "date" is required (YYYY-MM-DD), or pass all=true')

    const bookings = await getBookingsByDate(date, clinicId)
    return ok(bookings)
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json()
    const { pet_id, date, time, event_id, notes, service_type_id, requires_pickup, pickup_address, delivery_time } = body

    if (!pet_id) throw new ValidationError('pet_id is required')
    if (!date)   throw new ValidationError('date is required (YYYY-MM-DD)')
    if (!time)   throw new ValidationError('time is required (HH:MM)')
    if (!dateRegex.test(date)) throw new ValidationError('date must be YYYY-MM-DD')
    if (!timeRegex.test(time)) throw new ValidationError('time must be HH:MM (24h)')

    const booking = await createBooking({
      clinic_id: clinicId, pet_id, date, time, event_id, notes, service_type_id,
      requires_pickup: requires_pickup ?? false,
      pickup_address:  pickup_address  ?? null,
      delivery_time:   delivery_time   ?? null,
    })
    return ok(booking, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
