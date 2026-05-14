// POST /api/portal/register
// Registro de nuevo cliente desde el portal público de la clínica
// Crea el cliente (y opcionalmente su mascota) y devuelve el portal_token
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email, pet_name, pet_type, clinic_slug } = await request.json()

    if (!name?.trim() || !phone?.trim() || !clinic_slug?.trim()) {
      return Response.json({ error: 'Nombre, teléfono y clínica son requeridos.' }, { status: 400 })
    }

    // 1. Verificar clínica
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('slug', clinic_slug)
      .maybeSingle()

    if (clinicError) console.error('[register] clinic error:', clinicError)
    if (!clinic) return Response.json({ error: 'Portal no disponible.' }, { status: 404 })

    // 2. Verificar que el teléfono no esté ya registrado en esta clínica
    const normalized = phone.startsWith('+') ? phone : `+51${phone.replace(/\D/g, '')}`
    const raw = phone.replace(/\D/g, '')

    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id, portal_token')
      .eq('clinic_id', clinic.id)
      .or(`phone.eq.${raw},phone.eq.${normalized},phone.eq.+51${raw}`)
      .maybeSingle()

    if (existing) {
      // Ya existe — devolver su token directamente (login silencioso)
      let token = existing.portal_token
      if (!token) {
        token = crypto.randomUUID()
        await supabaseAdmin.from('clients').update({ portal_token: token }).eq('id', existing.id)
      }
      return ok({ token, existing: true })
    }

    // 3. Crear cliente
    const portalToken = crypto.randomUUID()
    const { data: newClient, error: insertError } = await supabaseAdmin
      .from('clients')
      .insert({
        name: name.trim(),
        phone: normalized,
        email: email?.trim() || null,
        clinic_id: clinic.id,
        portal_token: portalToken,
      })
      .select('id, portal_token')
      .single()

    if (insertError || !newClient) {
      console.error('[register] insert client error:', insertError)
      return Response.json({ error: 'Error al crear la cuenta. Inténtalo de nuevo.' }, { status: 500 })
    }

    // 4. Crear mascota si se proporcionó nombre
    if (pet_name?.trim()) {
      const { error: petError } = await supabaseAdmin
        .from('pets')
        .insert({
          name: pet_name.trim(),
          type: pet_type ?? 'dog',
          user_id: newClient.id,
          clinic_id: clinic.id,
        })

      if (petError) console.error('[register] insert pet error (non-fatal):', petError)
    }

    return ok({ token: newClient.portal_token, existing: false })
  } catch (e) {
    return handleRouteError(e)
  }
}
