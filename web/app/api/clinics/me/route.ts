import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, err, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .eq('owner_id', userId)
      .single()

    if (error) return err('Clínica no encontrada', 404)
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getAuthContext(request)
    const body = await request.json()
    const { name, phone, address, email, schedule, timezone } = body as Record<string, string>

    const { data, error } = await supabaseAdmin
      .from('clinics')
      .update({ name, phone, address, email, schedule, timezone })
      .eq('owner_id', userId)
      .select()
      .single()

    if (error) throw error
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
