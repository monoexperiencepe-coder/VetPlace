import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'

// PATCH /api/medical-records/:id — actualizar registro
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    const allowed = ['date', 'type', 'diagnosis', 'treatment', 'notes', 'vet', 'weight']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }

    const { data, error } = await supabaseAdmin
      .from('medical_records')
      .update(updates)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('MedicalRecord', id)

    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// DELETE /api/medical-records/:id — eliminar registro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)

    const { error } = await supabaseAdmin
      .from('medical_records')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) handleSupabaseError(error)

    return ok({ deleted: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
