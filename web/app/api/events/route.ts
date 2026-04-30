import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { ValidationError, handleSupabaseError } from '@/lib/errors'
import { createEvent } from '@/lib/services/eventService'
import type { EventType, EventStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VALID_TYPES: EventType[]      = ['grooming', 'vaccine', 'checkup', 'deworming']
const VALID_STATUSES: EventStatus[] = ['PENDING', 'NOTIFIED', 'COMPLETED', 'CANCELLED']

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const sp = new URL(request.url).searchParams
    const pet_id = sp.get('pet_id') ?? undefined
    const status = sp.get('status') ?? undefined
    const type   = sp.get('type')   ?? undefined
    const from   = sp.get('from')   ?? undefined
    const to     = sp.get('to')     ?? undefined

    if (status && !VALID_STATUSES.includes(status as EventStatus))
      throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`)
    if (type && !VALID_TYPES.includes(type as EventType))
      throw new ValidationError(`type must be one of: ${VALID_TYPES.join(', ')}`)

    let query = supabaseAdmin
      .from('events')
      .select(`*, pet:pets (id, name, type, user:clients (id, name, phone))`)
      .eq('clinic_id', clinicId)
      .order('scheduled_date', { ascending: true })

    if (pet_id) query = query.eq('pet_id', pet_id)
    if (status) query = query.eq('status', status)
    if (type)   query = query.eq('type', type)
    if (from)   query = query.gte('scheduled_date', from)
    if (to)     query = query.lte('scheduled_date', to)

    const { data, error } = await query
    if (error) handleSupabaseError(error)

    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json()
    const { pet_id, type, scheduled_date, notes } = body

    if (!pet_id)         throw new ValidationError('pet_id is required')
    if (!type)           throw new ValidationError('type is required')
    if (!scheduled_date) throw new ValidationError('scheduled_date is required (YYYY-MM-DD)')
    if (!VALID_TYPES.includes(type)) throw new ValidationError(`type must be one of: ${VALID_TYPES.join(', ')}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) throw new ValidationError('scheduled_date must be YYYY-MM-DD')

    const event = await createEvent({ clinic_id: clinicId, pet_id, type, scheduled_date })
    return ok(event, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
