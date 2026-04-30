import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { getPetsByUser } from '@/lib/services/petService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { clinicId } = await getAuthContext(request)
    const pets = await getPetsByUser(userId, clinicId)
    return ok(pets)
  } catch (e) {
    return handleRouteError(e)
  }
}
