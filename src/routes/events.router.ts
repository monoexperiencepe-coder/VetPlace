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
import { authMiddleware } from '../middleware/authMiddleware'
import type { EventType, EventStatus } from '../types'

const router = Router()
router.use(authMiddleware)

const VALID_TYPES: EventType[]      = ['grooming', 'vaccine', 'checkup', 'deworming']
const VALID_STATUSES: EventStatus[] = ['PENDING', 'NOTIFIED', 'COMPLETED', 'CANCELLED']

// GET /api/events/overdue
router.get('/overdue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('events')
      .select(`id, type, scheduled_date, pet:pets (id, name, user:clients (id, name, phone))`)
      .eq('clinic_id', clinicId)
      .lt('scheduled_date', today)
      .eq('status', 'PENDING')
      .order('scheduled_date', { ascending: true })

    if (error) handleSupabaseError(error)
    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/events/:id/notify
router.post('/:id/notify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .update({ status: 'NOTIFIED', notified_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    // TODO: integrar WhatsApp aquí
    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// POST /api/events
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pet_id, type, scheduled_date, notes } = req.body
    const clinicId = getClinicId(req)

    if (!pet_id)         throw new ValidationError('pet_id is required')
    if (!type)           throw new ValidationError('type is required')
    if (!scheduled_date) throw new ValidationError('scheduled_date is required (YYYY-MM-DD)')
    if (!VALID_TYPES.includes(type)) throw new ValidationError(`type must be one of: ${VALID_TYPES.join(', ')}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) throw new ValidationError('scheduled_date must be YYYY-MM-DD')

    const event = await createEvent({ clinic_id: clinicId, pet_id, type, scheduled_date })
    res.status(201).json({ ok: true, data: event })
  } catch (err) {
    next(err)
  }
})

// GET /api/events
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const { pet_id, status, type, from, to } = req.query as Record<string, string | undefined>

    if (status && !VALID_STATUSES.includes(status as EventStatus)) throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`)
    if (type   && !VALID_TYPES.includes(type as EventType))         throw new ValidationError(`type must be one of: ${VALID_TYPES.join(', ')}`)

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

// GET /api/events/pet/:petId
router.get('/pet/:petId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const status = req.query.status as EventStatus | undefined
    const events = await getEventsByPet(req.params.petId, clinicId, status)
    res.json({ ok: true, data: events })
  } catch (err) {
    next(err)
  }
})

// GET /api/events/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)

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

// PATCH /api/events/:id/complete
router.patch('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const event = await markEventAsCompleted(req.params.id)
    if ((event as Record<string, unknown>).clinic_id !== clinicId) throw new NotFoundError('Event', req.params.id)
    res.json({ ok: true, data: event })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/events/:id/cancel
router.patch('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const event = await cancelEvent(req.params.id, clinicId)
    res.json({ ok: true, data: event })
  } catch (err) {
    next(err)
  }
})

export default router
