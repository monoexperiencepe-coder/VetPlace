import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()
router.use(authMiddleware)

// GET /api/conversations
// Lista todas las conversaciones de la clínica
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = req.clinicId
    if (!clinicId) return res.status(400).json({ ok: false, error: 'Sin clinic_id' })

    const { data, error } = await supabase
      .from('conversations')
      .select('*, client:clients(name, phone)')
      .eq('clinic_id', clinicId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// POST /api/conversations
// Crea o devuelve una conversación existente por phone
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = req.clinicId
    if (!clinicId) return res.status(400).json({ ok: false, error: 'Sin clinic_id' })

    const { phone, client_name, client_id } = req.body as {
      phone: string; client_name?: string; client_id?: string
    }

    if (!phone) return res.status(400).json({ ok: false, error: 'phone es requerido' })

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('phone', phone)
      .single()

    if (existing) return res.json({ ok: true, data: existing })

    const { data, error } = await supabase
      .from('conversations')
      .insert({ clinic_id: clinicId, phone, client_name, client_id })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/conversations/:id/bot
// Activa o desactiva el bot en una conversación
router.patch('/:id/bot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { bot_active } = req.body as { bot_active: boolean }

    const { data, error } = await supabase
      .from('conversations')
      .update({ bot_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/conversations/:id/read
// Marca mensajes como leídos (reset unread_count)
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', id)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
