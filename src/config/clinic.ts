import type { Request } from 'express'

/**
 * Devuelve el clinic_id activo.
 * Prioridad: req.clinicId (JWT) → DEFAULT_CLINIC_ID (env fallback dev).
 */
export function getClinicId(req?: Request): string {
  const id = req?.clinicId ?? process.env.DEFAULT_CLINIC_ID
  if (!id) throw new Error('clinic_id no disponible: autenticá o definí DEFAULT_CLINIC_ID')
  return id
}
