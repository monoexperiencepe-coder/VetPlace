// POST /api/portal/otp-verify
// Verifica el código OTP y devuelve el token del cliente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { phone, code, clinic_slug } = await request.json()
    if (!phone || !code || !clinic_slug) {
      return Response.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('slug', clinic_slug)
      .maybeSingle()

    if (!clinic) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })

    const normalized = phone.startsWith('+') ? phone : `+51${phone.replace(/\D/g, '')}`

    // Buscar OTP válido
    const { data: otp } = await supabaseAdmin
      .from('portal_otps')
      .select('id, code, expires_at')
      .eq('clinic_id', clinic.id)
      .eq('phone', normalized)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp || otp.code !== code) {
      return Response.json({ error: 'Código incorrecto o expirado' }, { status: 401 })
    }

    // Marcar como usado
    await supabaseAdmin.from('portal_otps').update({ used: true }).eq('id', otp.id)

    // Obtener portal_token del cliente
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, portal_token')
      .eq('clinic_id', clinic.id)
      .or(`phone.eq.${phone},phone.eq.${normalized}`)
      .maybeSingle()

    if (!client) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 })

    return ok({ token: client.portal_token })
  } catch (e) {
    return handleRouteError(e)
  }
}
