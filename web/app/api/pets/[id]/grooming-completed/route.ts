import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { handleRouteError } from '@/lib/api-response'
import { recordGroomingCompleted } from '@/lib/services/petService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { completed_date } = body
    const { clinicId } = await getAuthContext(request)
    const result = await recordGroomingCompleted(id, clinicId, completed_date)
    return NextResponse.json({
      ok: true,
      data: result.pet,
      meta: {
        grooming_events_completed:   result.grooming_events_completed,
        next_grooming_event_created: result.next_grooming_event_created,
      },
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
