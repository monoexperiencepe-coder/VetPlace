// GET /api/portal/token?t=abc123
// Acceso directo por token (link que manda el bot por WhatsApp)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('t')
    if (!token) return Response.json({ error: 'Token requerido' }, { status: 400 })

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select(`
        id, name, phone, email, address, portal_token,
        clinic:clinics (id, name, slug, phone, logo_url, settings),
        pets (
          id, name, type, birth_date, default_price,
          medical_records (id, date, type, diagnosis, treatment, notes, vet, weight),
          bookings (id, date, time, status, notes, service_type_id),
          events (id, type, scheduled_date, status)
        )
      `)
      .eq('portal_token', token)
      .maybeSingle()

    if (error || !client) return Response.json({ error: 'Link inválido o expirado' }, { status: 404 })

    return ok(client)
  } catch (e) {
    return handleRouteError(e)
  }
}
