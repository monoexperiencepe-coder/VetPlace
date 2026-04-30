import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

// POST /api/medical-records — crear nuevo registro
export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    if (!body.pet_id) throw new Error('pet_id is required')
    if (!body.date)   throw new Error('date is required')

    const { data, error } = await supabaseAdmin
      .from('medical_records')
      .insert({
        clinic_id:  clinicId,
        pet_id:     body.pet_id,
        date:       body.date,
        type:       body.type       ?? 'consultation',
        diagnosis:  body.diagnosis  ?? null,
        treatment:  body.treatment  ?? null,
        notes:      body.notes      ?? null,
        vet:        body.vet        ?? null,
        weight:     body.weight     ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)

    return ok(data, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
