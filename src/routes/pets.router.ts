import { Router, Request, Response, NextFunction } from 'express'
import {
  createPet,
  getPetsByUser,
  getPetWithUser,
  recordGroomingCompleted,
} from '../services/petService'
import { ValidationError, handleSupabaseError } from '../utils/errors'
import { supabase } from '../config/supabase'
import { getClinicId } from '../config/clinic'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()
router.use(authMiddleware)

// POST /api/pets
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, name, type, birth_date, grooming_frequency_days, clinic_id: bodyClinicId } = req.body
    // QR flow: acepta clinic_id del body
    const clinicId = bodyClinicId ?? getClinicId(req)

    if (!user_id) throw new ValidationError('user_id is required')
    if (!name)    throw new ValidationError('name is required')
    if (!type)    throw new ValidationError('type is required')

    const validTypes = ['dog', 'cat', 'bird', 'rabbit', 'other']
    if (!validTypes.includes(type)) throw new ValidationError(`type must be one of: ${validTypes.join(', ')}`)
    if (grooming_frequency_days !== undefined && grooming_frequency_days <= 0) {
      throw new ValidationError('grooming_frequency_days must be greater than 0')
    }

    const pet = await createPet({ clinic_id: clinicId, user_id, name, type, birth_date, grooming_frequency_days })
    res.status(201).json({ ok: true, data: pet })
  } catch (err) {
    next(err)
  }
})

// GET /api/pets/search?q=nombre
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q?: string }
    const clinicId = getClinicId(req)

    if (!q || q.trim().length < 1) throw new ValidationError('q is required')

    const term = q.trim()
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, type, breed, birth_date, grooming_frequency_days, user_id, client:clients (id, name, phone, email, created_at)')
      .eq('clinic_id', clinicId)
      .ilike('name', `%${term}%`)
      .order('name', { ascending: true })
      .limit(20)

    if (error) handleSupabaseError(error)
    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// GET /api/pets/user/:userId
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const pets = await getPetsByUser(req.params.userId, clinicId)
    res.json({ ok: true, data: pets })
  } catch (err) {
    next(err)
  }
})

// GET /api/pets/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)
    const pet = await getPetWithUser(req.params.id, clinicId)
    res.json({ ok: true, data: pet })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/pets/:id/grooming-completed
router.patch('/:id/grooming-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { completed_date } = req.body
    const clinicId = getClinicId(req)
    const result = await recordGroomingCompleted(req.params.id, clinicId, completed_date)
    res.json({
      ok: true,
      data: result.pet,
      meta: {
        grooming_events_completed:   result.grooming_events_completed,
        next_grooming_event_created: result.next_grooming_event_created,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
