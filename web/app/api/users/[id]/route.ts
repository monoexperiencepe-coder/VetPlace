import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('User', id)

    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// PATCH /api/users/:id — actualizar datos del cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    const allowed = ['name', 'email', 'address', 'distrito', 'notes', 'phone']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Client', id)

    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// DELETE /api/users/:id — eliminar cliente (y sus mascotas en cascada vía FK)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)

    const { error } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) handleSupabaseError(error)

    return ok({ deleted: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
