import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

// POST /api/clinics/setup
// Crea la clínica para el usuario recién registrado y devuelve su clinic_id
router.post('/setup', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser?.id
    if (!userId) return res.status(401).json({ ok: false, error: 'No autenticado' })

    const { name, phone, address, email } = req.body as {
      name?: string; phone?: string; address?: string; email?: string
    }

    if (!name?.trim()) {
      return res.status(400).json({ ok: false, error: 'El nombre de la clínica es requerido' })
    }

    // Verificar si ya tiene clínica
    const { data: existing } = await supabase
      .from('clinics')
      .select('id, name')
      .eq('owner_id', userId)
      .single()

    if (existing) {
      return res.json({ ok: true, data: existing })
    }

    // Crear clínica nueva
    const { data: clinic, error } = await supabase
      .from('clinics')
      .insert({
        owner_id: userId,
        name:     name.trim(),
        phone:    phone?.trim() ?? null,
        address:  address?.trim() ?? null,
        email:    email?.trim() ?? null,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ ok: true, data: clinic })
  } catch (err) {
    next(err)
  }
})

// GET /api/clinics/me
// Devuelve la clínica del usuario autenticado
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser?.id
    if (!userId) return res.status(401).json({ ok: false, error: 'No autenticado' })

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('owner_id', userId)
      .single()

    if (error) return res.status(404).json({ ok: false, error: 'Clínica no encontrada' })

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/clinics/me
// Actualiza los datos de la clínica
router.patch('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser?.id
    if (!userId) return res.status(401).json({ ok: false, error: 'No autenticado' })

    const { name, phone, address, email, schedule, timezone } = req.body as Record<string, string>

    const { data, error } = await supabase
      .from('clinics')
      .update({ name, phone, address, email, schedule, timezone })
      .eq('owner_id', userId)
      .select()
      .single()

    if (error) throw error

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
