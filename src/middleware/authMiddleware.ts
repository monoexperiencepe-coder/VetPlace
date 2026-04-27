import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

/**
 * Verifica el JWT de Supabase en el header Authorization.
 * Si es válido, adjunta req.authUser y req.clinicId.
 * Si no hay token, cae al DEFAULT_CLINIC_ID del env (compatibilidad dev).
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    // Sin token → modo dev con clinic_id del env
    req.clinicId = process.env.DEFAULT_CLINIC_ID
    return next()
  }

  const token = authHeader.replace('Bearer ', '').trim()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
  }

  req.authUser = user
  req.clinicId = (user.user_metadata?.clinic_id as string | undefined)
    ?? process.env.DEFAULT_CLINIC_ID

  next()
}
