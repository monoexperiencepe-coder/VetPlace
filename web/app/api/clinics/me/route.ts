import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, err, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .single()

    if (error) return err('Clinica no encontrada', 404)
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    const allowed: Record<string, unknown> = {}
    if (typeof body.name     === 'string') allowed.name     = body.name
    if (typeof body.phone    === 'string') allowed.phone    = body.phone
    if (typeof body.address  === 'string') allowed.address  = body.address
    if (typeof body.email    === 'string') allowed.email    = body.email
    if (typeof body.schedule === 'string') allowed.schedule = body.schedule
    if (typeof body.timezone === 'string') allowed.timezone = body.timezone
    // settings: deep-merge with existing so individual tab saves don't overwrite other tabs
    if (body.settings && typeof body.settings === 'object') {
      const { data: current } = await supabaseAdmin
        .from('clinics')
        .select('settings')
        .eq('id', clinicId)
        .single()
      allowed.settings = { ...(current?.settings ?? {}), ...(body.settings as Record<string, unknown>) }
    }

    const { data, error } = await supabaseAdmin
      .from('clinics')
      .update(allowed)
      .eq('id', clinicId)
      .select()
      .single()

    if (error) throw error
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
