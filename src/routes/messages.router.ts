import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()
router.use(authMiddleware)

// GET /api/messages/:conversationId
// Devuelve los mensajes de una conversación (paginado)
router.get('/:conversationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params
    const limit  = Number(req.query.limit  ?? 50)
    const offset = Number(req.query.offset ?? 0)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    res.json({ ok: true, data })
  } catch (err) {
    next(err)
  }
})

// POST /api/messages/:conversationId
// Envía un mensaje desde el staff
router.post('/:conversationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params
    const { body: msgBody } = req.body as { body: string }

    if (!msgBody?.trim()) {
      return res.status(400).json({ ok: false, error: 'body es requerido' })
    }

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, from_type: 'staff', body: msgBody.trim() })
      .select()
      .single()

    if (msgError) throw msgError

    // Actualizar last_message en conversation
    await supabase
      .from('conversations')
      .update({ last_message: msgBody.trim(), last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    res.status(201).json({ ok: true, data: message })
  } catch (err) {
    next(err)
  }
})

export default router
