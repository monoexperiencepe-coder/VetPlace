import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'

// GET /api/routes?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const date = new URL(request.url).searchParams.get('date')
      ?? new Date().toISOString().slice(0, 10)

    // 1. Fetch routes for the date
    const { data: routes, error: rErr } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('date', date)
      .order('created_at', { ascending: true })

    if (rErr) handleSupabaseError(rErr)
    if (!routes || routes.length === 0) return ok([])

    // 2. Fetch stops for all routes (with booking time via join)
    const routeIds = routes.map(r => r.id)
    const { data: stops, error: sErr } = await supabaseAdmin
      .from('route_stops')
      .select(`
        *,
        booking:bookings (id, time, date, notes)
      `)
      .in('route_id', routeIds)
      .order('stop_order', { ascending: true })

    if (sErr) handleSupabaseError(sErr)

    // 3. Merge stops into routes
    const stopsMap: Record<string, typeof stops> = {}
    for (const stop of stops ?? []) {
      if (!stopsMap[stop.route_id]) stopsMap[stop.route_id] = []
      stopsMap[stop.route_id]!.push(stop)
    }

    const result = routes.map(r => ({
      ...r,
      stops: stopsMap[r.id] ?? [],
    }))

    return ok(result)
  } catch (e) {
    return handleRouteError(e)
  }
}

// POST /api/routes  — crear ruta nueva
export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json()

    const { name, date, driver_name, notes, stops: stopsInput } = body as {
      name: string
      date: string
      driver_name?: string
      notes?: string
      stops?: Array<{
        booking_id?: string
        stop_order: number
        address?: string
        distrito?: string
        client_name?: string
        pet_name?: string
        notes?: string
      }>
    }

    if (!name) throw new ValidationError('name is required')
    if (!date) throw new ValidationError('date is required')

    const { data: route, error: rErr } = await supabaseAdmin
      .from('routes')
      .insert({
        clinic_id:   clinicId,
        name,
        date,
        driver_name: driver_name ?? null,
        notes:       notes ?? null,
        status:      'pending',
      })
      .select()
      .single()

    if (rErr) handleSupabaseError(rErr)

    // Insert stops if provided
    if (stopsInput && stopsInput.length > 0) {
      const stopsToInsert = stopsInput.map(s => ({
        route_id:    route!.id,
        booking_id:  s.booking_id  ?? null,
        stop_order:  s.stop_order,
        address:     s.address     ?? null,
        distrito:    s.distrito    ?? null,
        client_name: s.client_name ?? null,
        pet_name:    s.pet_name    ?? null,
        notes:       s.notes       ?? null,
        status:      'pending',
      }))

      const { error: sErr } = await supabaseAdmin
        .from('route_stops')
        .insert(stopsToInsert)

      if (sErr) handleSupabaseError(sErr)
    }

    return ok({ ...route, stops: stopsInput ?? [] }, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
