import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, err, handleRouteError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthContext(request)
    const body = await request.json()
    const { name, phone, address, email } = body as {
      name?: string; phone?: string; address?: string; email?: string
    }

    if (!name?.trim()) return err('El nombre de la clínica es requerido', 400)

    const { data: existing } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('owner_id', userId)
      .single()

    if (existing) return ok(existing)

    const { data: clinic, error } = await supabaseAdmin
      .from('clinics')
      .insert({
        owner_id: userId,
        name:     name.trim(),
        phone:    phone?.trim() ?? null,
        address:  address?.trim() ?? null,
        email:    email?.trim() ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return ok(clinic, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
