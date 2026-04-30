import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { getEventsByPet } from '@/lib/services/eventService'
import type { EventStatus } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const { petId } = await params
    const { clinicId } = await getAuthContext(request)
    const status = new URL(request.url).searchParams.get('status') as EventStatus | null
    const events = await getEventsByPet(petId, clinicId, status ?? undefined)
    return ok(events)
  } catch (e) {
    return handleRouteError(e)
  }
}
