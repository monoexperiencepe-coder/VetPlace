import { Router, Request, Response, NextFunction } from 'express'
import {
  createBooking,
  getBookingById,
  getBookingsByDate,
  getBookingsByPet,
  confirmBooking,
  cancelBooking,
  completeBooking,
  isSlotAvailable,
} from '../services/bookingService'
import { supabase } from '../config/supabase'
import { handleSupabaseError, ValidationError } from '../utils/errors'
import { getClinicId } from '../config/clinic'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()
router.use(authMiddleware)

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

// GET /api/bookings/today
router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('bookings')
      .select(`id, date, time, status, notes, pet:pets (id, name, type, user:clients (id, name, phone))`)
      .eq('clinic_id', clinicId)
      .eq('date', today)
      .in('status', ['PENDING', 'CONFIRMED'])
      .order('time', { ascending: true })

    if (error) handleSupabaseError(error)
    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/bookings
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pet_id, date, time, event_id, notes } = req.body
    const clinicId = getClinicId(req)

    if (!pet_id) throw new ValidationError('pet_id is required')
    if (!date)   throw new ValidationError('date is required (YYYY-MM-DD)')
    if (!time)   throw new ValidationError('time is required (HH:MM)')
    if (!dateRegex.test(date)) throw new ValidationError('date must be YYYY-MM-DD')
    if (!timeRegex.test(time)) throw new ValidationError('time must be HH:MM (24h)')

    const booking = await createBooking({ clinic_id: clinicId, pet_id, date, time, event_id, notes })
    res.status(201).json({ ok: true, data: booking })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings?date=YYYY-MM-DD
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query
    const clinicId = getClinicId(req)

    if (!date || typeof date !== 'string') throw new ValidationError('query param "date" is required (YYYY-MM-DD)')

    const bookings = await getBookingsByDate(date, clinicId)
    res.json({ ok: true, data: bookings })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings/slot-available?date=YYYY-MM-DD&time=HH:MM
router.get('/slot-available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, time } = req.query
    const clinicId = getClinicId(req)

    if (!date || typeof date !== 'string') throw new ValidationError('query param "date" is required (YYYY-MM-DD)')
    if (!time || typeof time !== 'string') throw new ValidationError('query param "time" is required (HH:MM)')
    if (!dateRegex.test(date)) throw new ValidationError('date must be YYYY-MM-DD')
    if (!timeRegex.test(time)) throw new ValidationError('time must be HH:MM (24h)')

    const available = await isSlotAvailable(date, time, clinicId)
    res.json({ ok: true, data: { available } })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings/pet/:petId
router.get('/pet/:petId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const bookings = await getBookingsByPet(req.params.petId, clinicId)
    res.json({ ok: true, data: bookings })
  } catch (err) {
    next(err)
  }
})

// GET /api/bookings/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const booking = await getBookingById(req.params.id, clinicId)
    res.json({ ok: true, data: booking })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/bookings/:id/confirm
router.patch('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const booking = await confirmBooking(req.params.id, clinicId)
    res.json({ ok: true, data: booking })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const booking = await cancelBooking(req.params.id, clinicId)
    res.json({ ok: true, data: booking })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/bookings/:id/complete
router.patch('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const booking = await completeBooking(req.params.id, clinicId)
    res.json({ ok: true, data: booking })
  } catch (err) {
    next(err)
  }
})

export default router
