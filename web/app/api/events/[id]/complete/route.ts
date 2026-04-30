import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { markEventAsCompleted } from '@/lib/services/eventService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const event = await markEventAsCompleted(id)
    if ((event as unknown as Record<string, unknown>).clinic_id !== clinicId) throw new NotFoundError('Event', id)
    return ok(event)
  } catch (e) {
    return handleRouteError(e)
  }
}
