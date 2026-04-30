import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { createPet } from '@/lib/services/petService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, name, type, birth_date, grooming_frequency_days, clinic_id: bodyClinicId } = body

    const { clinicId: authClinicId } = await getAuthContext(request).catch(() => ({ clinicId: null }))
    const clinicId = bodyClinicId ?? authClinicId

    if (!user_id) throw new ValidationError('user_id is required')
    if (!name)    throw new ValidationError('name is required')
    if (!type)    throw new ValidationError('type is required')
    if (!clinicId) throw new ValidationError('clinic_id is required')

    const validTypes = ['dog', 'cat', 'bird', 'rabbit', 'other']
    if (!validTypes.includes(type)) throw new ValidationError(`type must be one of: ${validTypes.join(', ')}`)
    if (grooming_frequency_days !== undefined && grooming_frequency_days <= 0) {
      throw new ValidationError('grooming_frequency_days must be greater than 0')
    }

    const pet = await createPet({ clinic_id: clinicId, user_id, name, type, birth_date, grooming_frequency_days })
    return ok(pet, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
