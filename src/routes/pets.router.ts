import { Router, Request, Response, NextFunction } from 'express'
import {
  createPet,
  getPetsByUser,
  getPetWithUser,
  recordGroomingCompleted,
} from '../services/petService'
import { ValidationError } from '../utils/errors'
import { getClinicId } from '../config/clinic'

const router = Router()

// POST /api/pets
// Body: { user_id, name, type, birth_date?, grooming_frequency_days? }
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, name, type, birth_date, grooming_frequency_days } = req.body
    const clinicId = getClinicId()

    if (!user_id) throw new ValidationError('user_id is required')
    if (!name)    throw new ValidationError('name is required')
    if (!type)    throw new ValidationError('type is required')

    const validTypes = ['dog', 'cat', 'bird', 'rabbit', 'other']
    if (!validTypes.includes(type)) {
      throw new ValidationError(`type must be one of: ${validTypes.join(', ')}`)
    }

    if (grooming_frequency_days !== undefined && grooming_frequency_days <= 0) {
      throw new ValidationError('grooming_frequency_days must be greater than 0')
    }

    const pet = await createPet({
      clinic_id: clinicId,
      user_id,
      name,
      type,
      birth_date,
      grooming_frequency_days,
    })

    res.status(201).json({ ok: true, data: pet })
  } catch (err) {
    next(err)
  }
})

// GET /api/pets/user/:userId
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const pets = await getPetsByUser(req.params.userId, clinicId)
    res.json({ ok: true, data: pets })
  } catch (err) {
    next(err)
  }
})

// GET /api/pets/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const pet = await getPetWithUser(req.params.id, clinicId)
    res.json({ ok: true, data: pet })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/pets/:id/grooming-completed
// Body: { completed_date?: string }  (YYYY-MM-DD, default: hoy)
router.patch('/:id/grooming-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { completed_date } = req.body
    const clinicId = getClinicId()
    const pet = await recordGroomingCompleted(req.params.id, clinicId, completed_date)
    res.json({ ok: true, data: pet })
  } catch (err) {
    next(err)
  }
})

export default router
