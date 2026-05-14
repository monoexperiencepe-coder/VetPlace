// POST /api/portal/register
// Registro de nuevo cliente desde el portal público de la clínica
// Tolerante a columnas faltantes: intenta con todos los campos, luego con los básicos
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const {
      name, phone, email, address, district, notes,
      pet_name, pet_type, pet_breed, pet_birth, grooming_days,
      clinic_slug,
    } = await request.json()

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

    // 2. Verificar si el teléfono ya existe en esta clínica
    const normalized = phone.startsWith('+') ? phone : `+51${phone.replace(/\D/g, '')}`
    const raw = phone.replace(/\D/g, '')

    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id, portal_token')
      .eq('clinic_id', clinic.id)
      .or(`phone.eq.${raw},phone.eq.${normalized},phone.eq.+51${raw}`)
      .maybeSingle()

    if (existing) {
      let token = existing.portal_token
      if (!token) {
        token = crypto.randomUUID()
        await supabaseAdmin.from('clients').update({ portal_token: token }).eq('id', existing.id)
      }
      return ok({ token, existing: true })
    }

    // 3. Crear cliente — primero con todos los campos, luego sólo con los básicos si falla
    const portalToken = crypto.randomUUID()

    const fullClientPayload = {
      name: name.trim(),
      phone: normalized,
      email: email?.trim() || null,
      address: address?.trim() || null,
      district: district?.trim() || null,
      notes: notes?.trim() || null,
      clinic_id: clinic.id,
      portal_token: portalToken,
    }

    let newClient: { id: string; portal_token: string } | null = null

    // Attempt 1: full payload (with optional columns)
    const { data: c1, error: e1 } = await supabaseAdmin
      .from('clients')
      .insert(fullClientPayload)
      .select('id, portal_token')
      .single()

    if (e1) {
      console.warn('[register] full insert failed, retrying with base fields:', e1.message)
      // Attempt 2: base-only payload (guaranteed columns)
      const { data: c2, error: e2 } = await supabaseAdmin
        .from('clients')
        .insert({
          name: name.trim(),
          phone: normalized,
          email: email?.trim() || null,
          address: address?.trim() || null,
          clinic_id: clinic.id,
          portal_token: portalToken,
        })
        .select('id, portal_token')
        .single()

      if (e2) {
        console.error('[register] base insert also failed:', e2)
        // Attempt 3: absolute minimum
        const { data: c3, error: e3 } = await supabaseAdmin
          .from('clients')
          .insert({
            name: name.trim(),
            phone: normalized,
            clinic_id: clinic.id,
            portal_token: portalToken,
          })
          .select('id, portal_token')
          .single()

        if (e3 || !c3) {
          console.error('[register] minimal insert failed:', e3)
          return Response.json({ error: 'Error al crear la cuenta. Inténtalo de nuevo.' }, { status: 500 })
        }
        newClient = c3
      } else {
        newClient = c2
      }
    } else {
      newClient = c1
    }

    if (!newClient) {
      return Response.json({ error: 'Error al crear la cuenta.' }, { status: 500 })
    }

    // 4. Crear mascota (tolerante a columnas faltantes)
    if (pet_name?.trim()) {
      const fullPetPayload = {
        name: pet_name.trim(),
        type: pet_type ?? 'dog',
        breed: pet_breed?.trim() || null,
        birth_date: pet_birth || null,
        grooming_every_days: grooming_days ? Number(grooming_days) : null,
        user_id: newClient.id,
        clinic_id: clinic.id,
      }

      const { error: pe1 } = await supabaseAdmin.from('pets').insert(fullPetPayload)

      if (pe1) {
        console.warn('[register] full pet insert failed, retrying:', pe1.message)
        const { error: pe2 } = await supabaseAdmin.from('pets').insert({
          name: pet_name.trim(),
          type: pet_type ?? 'dog',
          birth_date: pet_birth || null,
          user_id: newClient.id,
          clinic_id: clinic.id,
        })
        if (pe2) {
          console.warn('[register] base pet insert failed, retrying minimal:', pe2.message)
          await supabaseAdmin.from('pets').insert({
            name: pet_name.trim(),
            type: pet_type ?? 'dog',
            user_id: newClient.id,
            clinic_id: clinic.id,
          })
        }
      }
    }

    return ok({ token: newClient.portal_token, existing: false })
  } catch (e) {
    return handleRouteError(e)
  }
}
