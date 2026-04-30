import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { getPetWithUser } from '@/lib/services/petService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const pet = await getPetWithUser(id, clinicId)
    return ok(pet)
  } catch (e) {
    return handleRouteError(e)
  }
}
