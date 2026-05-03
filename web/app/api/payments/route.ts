import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

const VALID_METHODS = ['cash', 'transfer', 'card', 'yape', 'other'] as const

// GET /api/payments?date=YYYY-MM-DD  (defaults to today)
//     /api/payments?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const sp   = new URL(request.url).searchParams
    const date = sp.get('date')
    const from = sp.get('from')
    const to   = sp.get('to')

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        client:clients (id, name, phone),
        pet:pets (id, name, type),
        booking:bookings (id, date, time, notes)
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })

    if (date) {
      query = query.eq('date', date)
    } else if (from || to) {
      if (from) query = query.gte('date', from)
      if (to)   query = query.lte('date', to)
    } else {
      // Default: today
      const today = new Date().toISOString().slice(0, 10)
      query = query.eq('date', today)
    }

    const { data, error } = await query
    if (error) handleSupabaseError(error)

    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    if (!body.amount) throw new ValidationError('amount is required')
    const amount = parseFloat(String(body.amount))
    if (isNaN(amount) || amount <= 0) throw new ValidationError('amount must be a positive number')

    const method = String(body.method ?? 'cash')
    if (!VALID_METHODS.includes(method as typeof VALID_METHODS[number]))
      throw new ValidationError(`method must be one of: ${VALID_METHODS.join(', ')}`)

    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        clinic_id:   clinicId,
        booking_id:  body.booking_id  ?? null,
        client_id:   body.client_id   ?? null,
        pet_id:      body.pet_id      ?? null,
        amount,
        method,
        description: body.description ?? null,
        date:        body.date        ?? today,
      })
      .select(`
        *,
        client:clients (id, name, phone),
        pet:pets (id, name, type),
        booking:bookings (id, date, time, notes)
      `)
      .single()

    if (error) handleSupabaseError(error)

    return ok(data, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
