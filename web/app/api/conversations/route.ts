import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, err, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*, client:clients(name, phone)')
      .eq('clinic_id', clinicId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) throw error
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json()
    const { phone, client_name, client_id } = body as {
      phone: string; client_name?: string; client_id?: string
    }

    if (!phone) return err('phone es requerido', 400)

    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('phone', phone)
      .single()

    if (existing) return ok(existing)

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({ clinic_id: clinicId, phone, client_name, client_id })
      .select()
      .single()

    if (error) throw error
    return ok(data, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
