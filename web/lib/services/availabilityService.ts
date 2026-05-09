// ─── Availability Service ─────────────────────────────────────────────────────
// Calcula slots libres consultando la tabla bookings.
// Busca en los próximos N días contra los horarios operativos de la clínica.

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AvailableSlot {
  date:  string   // YYYY-MM-DD
  time:  string   // HH:MM
  label: string   // "Jueves 10:00" — listo para mostrar en mensaje
}

// Franjas horarias base — se pueden extender con clinic.settings.horarios
const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * Devuelve los próximos slots disponibles para una clínica.
 * Busca en los próximos `lookAheadDays` días y devuelve hasta `maxSlots` resultados.
 */
export async function getNextAvailableSlots(
  clinicId:      string,
  lookAheadDays: number = 7,
  maxSlots:      number = 3
): Promise<AvailableSlot[]> {
  const today  = new Date()
  const dates: string[] = []

  // Generar fechas a revisar (excluyendo domingos)
  for (let i = 1; i <= lookAheadDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (d.getDay() === 0) continue  // saltar domingos
    dates.push(d.toISOString().split('T')[0])
  }

  if (dates.length === 0) return []

  // Cargar todos los bookings activos en ese rango de fechas
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('date, time')
    .eq('clinic_id', clinicId)
    .in('date', dates)
    .in('status', ['PENDING', 'CONFIRMED'])

  // Índice de slots ocupados: "YYYY-MM-DD|HH:MM"
  const occupied = new Set<string>(
    (bookings ?? []).map((b: { date: string; time: string }) => `${b.date}|${b.time}`)
  )

  const available: AvailableSlot[] = []

  outer:
  for (const date of dates) {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay()
    const dayName   = WEEKDAY_NAMES[dayOfWeek]

    for (const time of DEFAULT_SLOTS) {
      if (occupied.has(`${date}|${time}`)) continue

      available.push({
        date,
        time,
        label: `${dayName} ${time}`,
      })

      if (available.length >= maxSlots) break outer
    }
  }

  return available
}
