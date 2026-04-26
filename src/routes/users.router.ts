import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { handleSupabaseError, NotFoundError, ValidationError } from '../utils/errors'
import { getClinicId } from '../config/clinic'

const router = Router()

// POST /api/users
// Body: { phone: string, name?: string }
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, name } = req.body
    const clinicId = getClinicId()

    if (!phone) throw new ValidationError('phone is required')
    if (!/^\+\d{7,15}$/.test(phone)) throw new ValidationError('phone must be E.164 format: +51987654321')

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
// Buscar clientes por nombre o teléfono (parcial, case-insensitive)
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q?: string }
    const clinicId = getClinicId()

    if (!q || q.trim().length < 2) {
      throw new ValidationError('q must be at least 2 characters')
    }

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
    const clinicId = getClinicId()

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
// Buscar cliente por número (útil para el webhook de WhatsApp)
router.get('/phone/:phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = decodeURIComponent(req.params.phone)
    const clinicId = getClinicId()

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
