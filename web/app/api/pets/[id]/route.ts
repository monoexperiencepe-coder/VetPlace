import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'
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

// PATCH /api/pets/:id — actualizar datos de la mascota
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    const allowed = ['name', 'type', 'breed', 'birth_date', 'grooming_frequency_days']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }

    const { data, error } = await supabaseAdmin
      .from('pets')
      .update(updates)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Pet', id)

    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// DELETE /api/pets/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)

    const { error } = await supabaseAdmin
      .from('pets')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) handleSupabaseError(error)

    return ok({ deleted: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
