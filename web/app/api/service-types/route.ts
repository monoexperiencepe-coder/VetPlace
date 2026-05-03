import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const { data, error } = await supabaseAdmin
      .from('service_types')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('sort_order').order('created_at')
    if (error) handleSupabaseError(error)
    return ok(data ?? [])
  } catch (e) { return handleRouteError(e) }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>
    if (!body.name) throw new ValidationError('name is required')
    const { data, error } = await supabaseAdmin
      .from('service_types')
      .insert({
        clinic_id:  clinicId,
        name:       String(body.name),
        price:      body.price != null ? Number(body.price) : null,
        active:     body.active !== false,
        sort_order: body.sort_order ? Number(body.sort_order) : 0,
      })
      .select().single()
    if (error) handleSupabaseError(error)
    return ok(data, 201)
  } catch (e) { return handleRouteError(e) }
}
