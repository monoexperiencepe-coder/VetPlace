// GET /api/portal/token?t=abc123
// Acceso por token — queries separadas para mayor robustez
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('t')
    if (!token) return Response.json({ error: 'Token requerido' }, { status: 400 })

    // 1. Buscar cliente por token
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, email, address, portal_token, clinic_id')
      .eq('portal_token', token)
      .maybeSingle()

    if (clientError) console.error('[token] client error:', clientError)
    if (!client) return Response.json({ error: 'Link inválido o expirado' }, { status: 404 })

    // 2. Buscar clínica
    const { data: clinicRaw } = await supabaseAdmin
      .from('clinics')
      .select('id, name, slug, phone, settings')
      .eq('id', client.clinic_id)
      .maybeSingle()

    const clinic = clinicRaw ? {
      id:       clinicRaw.id,
      name:     clinicRaw.name,
      slug:     clinicRaw.slug,
      phone:    clinicRaw.phone,
      logo_url: (clinicRaw.settings as Record<string, string> | null)?.logo_url ?? null,
    } : null

    // 3. Buscar mascotas
    const { data: pets = [] } = await supabaseAdmin
      .from('pets')
      .select('id, name, type, birth_date, default_price')
      .eq('clinic_id', client.clinic_id)
      .eq('user_id', client.id)

    // 4. Para cada mascota, buscar historial y citas (tolerante a errores)
    const petsWithData = await Promise.all((pets ?? []).map(async (pet) => {
      const [recordsRes, bookingsRes, eventsRes] = await Promise.allSettled([
        supabaseAdmin
          .from('medical_records')
          .select('id, date, type, diagnosis, treatment, notes, vet, weight')
          .eq('pet_id', pet.id)
          .order('date', { ascending: false }),
        supabaseAdmin
          .from('bookings')
          .select('id, date, time, status, notes, service_type_id')
          .eq('pet_id', pet.id)
          .order('date', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('events')
          .select('id, type, scheduled_date, status')
          .eq('pet_id', pet.id)
          .eq('status', 'PENDING')
          .order('scheduled_date', { ascending: true }),
      ])

      return {
        ...pet,
        medical_records: recordsRes.status === 'fulfilled' ? (recordsRes.value.data ?? []) : [],
        bookings:        bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data ?? []) : [],
        events:          eventsRes.status  === 'fulfilled' ? (eventsRes.value.data  ?? []) : [],
      }
    }))

    return ok({
      id:           client.id,
      name:         client.name,
      phone:        client.phone,
      email:        client.email,
      address:      client.address,
      portal_token: client.portal_token,
      clinic:       clinic,
      pets:         petsWithData,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
