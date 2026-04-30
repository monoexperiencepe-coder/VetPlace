import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { cancelEvent } from '@/lib/services/eventService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const event = await cancelEvent(id, clinicId)
    return ok(event)
  } catch (e) {
    return handleRouteError(e)
  }
}
