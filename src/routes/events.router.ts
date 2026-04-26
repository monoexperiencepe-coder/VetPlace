import { Router, Request, Response, NextFunction } from 'express'
import {
  createEvent,
  getEventsByPet,
  markEventAsCompleted,
  cancelEvent,
} from '../services/eventService'
import { supabase } from '../config/supabase'
import { handleSupabaseError, NotFoundError, ValidationError } from '../utils/errors'
import { getClinicId } from '../config/clinic'
import type { EventType, EventStatus } from '../types'

const router = Router()

const VALID_TYPES: EventType[]   = ['grooming', 'vaccine', 'checkup', 'deworming']
const VALID_STATUSES: EventStatus[] = ['PENDING', 'NOTIFIED', 'COMPLETED', 'CANCELLED']

// ─── POST /api/events ────────────────────────────────────────────────────────
// Crear un evento manualmente (vacuna, desparasitación, etc.)
// Body: { pet_id, type, scheduled_date, notes? }
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pet_id, type, scheduled_date, notes } = req.body
    const clinicId = getClinicId()

    if (!pet_id)         throw new ValidationError('pet_id is required')
    if (!type)           throw new ValidationError('type is required')
    if (!scheduled_date) throw new ValidationError('scheduled_date is required (YYYY-MM-DD)')

    if (!VALID_TYPES.includes(type)) {
      throw new ValidationError(`type must be one of: ${VALID_TYPES.join(', ')}`)
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
      throw new ValidationError('scheduled_date must be YYYY-MM-DD')
    }

    const event = await createEvent({ clinic_id: clinicId, pet_id, type, scheduled_date })

    res.status(201).json({ ok: true, data: event })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/events ─────────────────────────────────────────────────────────
// Listar eventos de la clínica con filtros opcionales
// Query params: pet_id?, status?, type?, from?, to?
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const { pet_id, status, type, from, to } = req.query as Record<string, string | undefined>

    if (status && !VALID_STATUSES.includes(status as EventStatus)) {
      throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    if (type && !VALID_TYPES.includes(type as EventType)) {
      throw new ValidationError(`type must be one of: ${VALID_TYPES.join(', ')}`)
    }

    let query = supabase
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

    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/events/pet/:petId ───────────────────────────────────────────────
// Historial de eventos de una mascota, con filtro opcional por status
// Query: status?
router.get('/pet/:petId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const status = req.query.status as EventStatus | undefined

    const events = await getEventsByPet(req.params.petId, clinicId, status)
    res.json({ ok: true, data: events })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/events/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()

    const { data, error } = await supabase
      .from('events')
      .select(`*, pet:pets (*, user:clients (*))`)
      .eq('id', req.params.id)
      .eq('clinic_id', clinicId)
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Event', req.params.id)

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/events/:id/complete ──────────────────────────────────────────
router.patch('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const event = await markEventAsCompleted(req.params.id)

    // Verificar que el evento pertenece a esta clínica
    if ((event as any).clinic_id !== clinicId) {
      throw new NotFoundError('Event', req.params.id)
    }

    res.json({ ok: true, data: event })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/events/:id/cancel ────────────────────────────────────────────
router.patch('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const event = await cancelEvent(req.params.id, clinicId)
    res.json({ ok: true, data: event })
  } catch (err) {
    next(err)
  }
})

export default router
