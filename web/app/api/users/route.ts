import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, name, email, address, distrito, notes, clinic_id: bodyClinicId } = body

    const { clinicId: authClinicId } = await getAuthContext(request).catch(() => ({ clinicId: null }))
    const clinicId = bodyClinicId ?? authClinicId

    if (!phone) throw new ValidationError('phone is required')
    if (!clinicId) throw new ValidationError('clinic_id is required')

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        phone,
        name:      name     ?? null,
        email:     email    ?? null,
        address:   address  ?? null,
        distrito:  distrito ?? null,
        notes:     notes    ?? null,
        clinic_id: clinicId,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)

    return ok(data, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
