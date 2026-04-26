import { getPetsDueForGrooming } from '../services/petService'
import {
  getUpcomingPendingEvents,
  scheduleGroomingEvent,
  markEventAsNotified,
} from '../services/eventService'
import { sendGroomingReminder } from '../services/notificationService'
import { toErrorMessage } from '../utils/errors'
import { getClinicId } from '../config/clinic'

const REMINDER_DAYS_AHEAD = 2

export async function runCheckUpcomingEventsJob(): Promise<void> {
  const clinicId = getClinicId()
  const start = Date.now()
  console.log(`\n========================================`)
  console.log(`[JOB] checkUpcomingEvents — ${new Date().toISOString()}`)
  console.log(`[JOB] clinic_id: ${clinicId}`)
  console.log(`========================================`)

  await phase1_generateGroomingEvents(clinicId)
  await phase2_sendReminders(clinicId)

  console.log(`[JOB] Finalizado en ${Date.now() - start}ms\n`)
}

async function phase1_generateGroomingEvents(clinicId: string): Promise<void> {
  console.log('\n[Phase 1] Generando eventos de baño...')

  let pets
  try {
    pets = await getPetsDueForGrooming(clinicId, REMINDER_DAYS_AHEAD + 1)
  } catch (err) {
    console.error('[Phase 1] Error al obtener mascotas:', toErrorMessage(err))
    return
  }

  const results = { created: 0, skipped: 0, errors: 0 }

  for (const pet of pets) {
    try {
      const event = await scheduleGroomingEvent(pet)
      if (event) {
        console.log(`  ✓ Evento creado: "${pet.name}" → ${event.scheduled_date}`)
        results.created++
      } else {
        console.log(`  ~ Saltado: "${pet.name}" ya tiene evento activo`)
        results.skipped++
      }
    } catch (err) {
      console.error(`  ✗ Error en "${pet.name}":`, toErrorMessage(err))
      results.errors++
    }
  }

  console.log(`[Phase 1] creados: ${results.created} | saltados: ${results.skipped} | errores: ${results.errors}`)
}

async function phase2_sendReminders(clinicId: string): Promise<void> {
  console.log(`\n[Phase 2] Enviando recordatorios (próximos ${REMINDER_DAYS_AHEAD} días)...`)

  let events
  try {
    events = await getUpcomingPendingEvents(clinicId, REMINDER_DAYS_AHEAD)
  } catch (err) {
    console.error('[Phase 2] Error al obtener eventos:', toErrorMessage(err))
    return
  }

  const results = { sent: 0, errors: 0 }

  for (const event of events) {
    const label = `${event.pet.name} (${event.scheduled_date})`
    try {
      const result = await sendGroomingReminder(event)
      if (!result.success) throw new Error(result.error ?? 'WhatsApp error')
      await markEventAsNotified(event.id)
      console.log(`  ✓ Notificado: ${label}`)
      results.sent++
    } catch (err) {
      console.error(`  ✗ Falló: ${label} —`, toErrorMessage(err))
      results.errors++
    }
  }

  console.log(`[Phase 2] enviados: ${results.sent} | errores: ${results.errors}`)
}
