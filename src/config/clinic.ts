/**
 * Devuelve el clinic_id activo.
 *
 * Por ahora lee DEFAULT_CLINIC_ID del entorno (una sola clínica en dev).
 * En la siguiente fase esto vendrá del JWT del request (req.clinic_id),
 * permitiendo que cada veterinaria vea solo sus propios datos.
 */
export function getClinicId(): string {
  const id = process.env.DEFAULT_CLINIC_ID
  if (!id) throw new Error('DEFAULT_CLINIC_ID no está definido en el entorno')
  return id
}
