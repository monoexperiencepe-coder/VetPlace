import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'

// PATCH /api/routes/[id]  — actualizar status o datos de la ruta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { clinicId } = await getAuthContext(request)
    const { id } = await params
    const body = await request.json()

    const allowed: Record<string, unknown> = {}
    if (typeof body.status      === 'string') allowed.status      = body.status
    if (typeof body.driver_name === 'string') allowed.driver_name = body.driver_name
    if (typeof body.notes       === 'string') allowed.notes       = body.notes

    const { data, error } = await supabaseAdmin
      .from('routes')
      .update({ ...allowed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Route', id)
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// DELETE /api/routes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { clinicId } = await getAuthContext(request)
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('routes')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) handleSupabaseError(error)
    return ok({ deleted: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
