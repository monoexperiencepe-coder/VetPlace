import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>
    const allowed = ['name', 'price', 'active', 'sort_order']
    const updates: Record<string, unknown> = {}
    for (const k of allowed) if (k in body) updates[k] = body[k] ?? null
    const { data, error } = await supabaseAdmin
      .from('service_types').update(updates)
      .eq('id', id).eq('clinic_id', clinicId).select().single()
    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('ServiceType', id)
    return ok(data)
  } catch (e) { return handleRouteError(e) }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const { error } = await supabaseAdmin
      .from('service_types').delete().eq('id', id).eq('clinic_id', clinicId)
    if (error) handleSupabaseError(error)
    return ok({ deleted: true })
  } catch (e) { return handleRouteError(e) }
}
