import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { isSlotAvailable } from '@/lib/services/bookingService'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const sp = new URL(request.url).searchParams
    const date = sp.get('date')
    const time = sp.get('time')

    if (!date) throw new ValidationError('query param "date" is required (YYYY-MM-DD)')
    if (!time) throw new ValidationError('query param "time" is required (HH:MM)')
    if (!dateRegex.test(date)) throw new ValidationError('date must be YYYY-MM-DD')
    if (!timeRegex.test(time)) throw new ValidationError('time must be HH:MM (24h)')

    const available = await isSlotAvailable(date, time, clinicId)
    return ok({ available })
  } catch (e) {
    return handleRouteError(e)
  }
}
