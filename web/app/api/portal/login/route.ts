// POST /api/portal/login
// Login directo por teléfono — sin OTP, sin contraseña
// El número de celular es suficiente para acceder al pasaporte (no hay datos sensibles)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { phone, clinic_slug } = await request.json()
    if (!phone || !clinic_slug) {
      return Response.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // Verificar clínica
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('slug', clinic_slug)
      .maybeSingle()

    if (clinicError) console.error('[login] clinic error:', clinicError)
    if (!clinic) return Response.json({ error: 'Portal no disponible.' }, { status: 404 })

    // Buscar cliente por teléfono (con o sin +51)
    const normalized = phone.startsWith('+') ? phone : `+51${phone.replace(/\D/g, '')}`
    const raw = phone.replace(/\D/g, '')

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, portal_token')
      .eq('clinic_id', clinic.id)
      .or(`phone.eq.${raw},phone.eq.${normalized},phone.eq.+51${raw}`)
      .maybeSingle()

    if (clientError) console.error('[login] client error:', clientError)
    if (!client) {
      return Response.json(
        { error: 'No encontramos una cuenta con ese número. Consulta a tu veterinaria.' },
        { status: 404 }
      )
    }

    return ok({ token: client.portal_token })
  } catch (e) {
    return handleRouteError(e)
  }
}
