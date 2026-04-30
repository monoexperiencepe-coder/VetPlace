import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import { getPetsDueForGrooming } from '@/lib/services/petService'
import { getUpcomingPendingEvents, scheduleGroomingEvent, markEventAsNotified } from '@/lib/services/eventService'
import { sendGroomingReminder } from '@/lib/services/notificationService'
import { toErrorMessage } from '@/lib/errors'

const REMINDER_DAYS_AHEAD = 2

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return err('Unauthorized', 401)
  }

  const clinicId = process.env.DEFAULT_CLINIC_ID
  if (!clinicId) return err('DEFAULT_CLINIC_ID not configured', 500)

  try {
    const phase1 = await phase1_generateGroomingEvents(clinicId)
    const phase2 = await phase2_sendReminders(clinicId)

    return ok({ message: 'Job ejecutado', phase1, phase2 })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error en cron', 500)
  }
}

async function phase1_generateGroomingEvents(clinicId: string) {
  const results = { created: 0, skipped: 0, errors: 0 }

  let pets
  try {
    pets = await getPetsDueForGrooming(clinicId, REMINDER_DAYS_AHEAD + 1)
  } catch (e) {
    console.error('[Cron Phase 1] Error al obtener mascotas:', toErrorMessage(e))
    return results
  }

  for (const pet of pets) {
    try {
      const event = await scheduleGroomingEvent(pet)
      if (event) results.created++
      else results.skipped++
    } catch (e) {
      console.error(`[Cron Phase 1] Error en "${pet.name}":`, toErrorMessage(e))
      results.errors++
    }
  }

  return results
}

async function phase2_sendReminders(clinicId: string) {
  const results = { sent: 0, errors: 0 }

  let events
  try {
    events = await getUpcomingPendingEvents(clinicId, REMINDER_DAYS_AHEAD)
  } catch (e) {
    console.error('[Cron Phase 2] Error al obtener eventos:', toErrorMessage(e))
    return results
  }

  for (const event of events) {
    try {
      const result = await sendGroomingReminder(event)
      if (!result.success) throw new Error(result.error ?? 'WhatsApp error')
      await markEventAsNotified(event.id)
      results.sent++
    } catch (e) {
      console.error(`[Cron Phase 2] Falló evento ${event.id}:`, toErrorMessage(e))
      results.errors++
    }
  }

  return results
}
