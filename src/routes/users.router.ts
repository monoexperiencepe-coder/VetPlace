import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { handleSupabaseError, NotFoundError, ValidationError } from '../utils/errors'
import { getClinicId } from '../config/clinic'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()
router.use(authMiddleware)

// POST /api/users — público también (registro via QR)
// Body: { phone, name?, clinic_id? }
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, name, clinic_id: bodyClinicId } = req.body
    // QR flow: acepta clinic_id del body; autenticado: usa JWT
    const clinicId = bodyClinicId ?? getClinicId(req)

    if (!phone) throw new ValidationError('phone is required')

    const { data, error } = await supabase
      .from('clients')
      .insert({ phone, name: name ?? null, clinic_id: clinicId })
      .select()
      .single()

    if (error) handleSupabaseError(error)

    res.status(201).json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/search?q=...
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q?: string }
    const clinicId = getClinicId(req)

    if (!q || q.trim().length < 2) throw new ValidationError('q must be at least 2 characters')

    const term = q.trim()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
      .order('name', { ascending: true })
      .limit(20)

    if (error) handleSupabaseError(error)

    res.json({ ok: true, data: data ?? [] })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId(req)

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .eq('clinic_id', clinicId)
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('User', req.params.id)

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/phone/:phone
router.get('/phone/:phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = decodeURIComponent(req.params.phone)
    const clinicId = getClinicId(req)

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('phone', phone)
      .eq('clinic_id', clinicId)
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('User', phone)

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
