// POST /api/portal/otp-send
// Envía código OTP al teléfono del cliente para login sin contraseña
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { phone, clinic_slug } = await request.json()
    if (!phone || !clinic_slug) {
      return Response.json({ error: 'phone y clinic_slug requeridos' }, { status: 400 })
    }

    // Verificar que la clínica existe
    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('id, name, phone as clinic_phone')
      .eq('slug', clinic_slug)
      .maybeSingle()

    if (!clinic) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })

    // Verificar que el cliente existe en esa clínica
    const normalized = phone.startsWith('+') ? phone : `+51${phone.replace(/\D/g, '')}`
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, portal_token')
      .eq('clinic_id', clinic.id)
      .or(`phone.eq.${phone},phone.eq.${normalized}`)
      .maybeSingle()

    if (!client) {
      return Response.json({ error: 'No encontramos una cuenta con ese número en esta clínica.' }, { status: 404 })
    }

    // Crear OTP (invalidar anteriores del mismo teléfono)
    await supabaseAdmin.from('portal_otps')
      .update({ used: true })
      .eq('phone', normalized)
      .eq('clinic_id', clinic.id)
      .eq('used', false)

    const code = generateCode()
    await supabaseAdmin.from('portal_otps').insert({
      clinic_id: clinic.id,
      phone: normalized,
      code,
    })

    // En producción: enviar el código por WhatsApp/SMS aquí
    // Por ahora lo devolvemos en la respuesta (solo para desarrollo)
    const isDev = process.env.NODE_ENV === 'development'

    console.log(`[OTP] ${normalized} → ${code}`)

    return ok({
      sent: true,
      // Solo en dev mostramos el código para testing
      ...(isDev ? { _dev_code: code } : {}),
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
