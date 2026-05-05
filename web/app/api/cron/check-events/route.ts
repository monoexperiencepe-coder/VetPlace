import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, err } from '@/lib/api-response'
import { getPetsDueForGrooming } from '@/lib/services/petService'
import { getUpcomingPendingEvents, scheduleGroomingEvent, markEventAsNotified } from '@/lib/services/eventService'
import { emitPetGroomingDue, emitPetEventDue } from '@/lib/domain-events'
import { toErrorMessage } from '@/lib/errors'

const REMINDER_DAYS_AHEAD = 2

/**
 * GET /api/cron/check-events
 *
 * Multi-tenant: itera todas las clinicas activas en lugar de usar DEFAULT_CLINIC_ID.
 * En lugar de enviar WhatsApp directamente, emite domain_events que el automation
 * engine convierte en notificaciones segun las reglas de cada clinica.
 *
 * Frecuencia recomendada: 1 vez al dia (ej. 08:00 UTC).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return err('Unauthorized', 401)
  }

  try {
    const { data: clinics, error: clinicsError } = await supabaseAdmin
      .from('clinics')
      .select('id')

    if (clinicsError) throw new Error(`Failed to fetch clinics: ${clinicsError.message}`)
    if (!clinics || clinics.length === 0) return ok({ message: 'No clinics found', total: 0 })

    const summary: Record<string, { phase1: object; phase2: object }> = {}

    for (const clinic of clinics) {
      const clinicId = clinic.id as string
      try {
        const phase1 = await phase1_generateGroomingEvents(clinicId)
        const phase2 = await phase2_emitReminders(clinicId)
        summary[clinicId] = { phase1, phase2 }
      } catch (e) {
        console.error(`[check-events] Error en clinica ${clinicId}:`, toErrorMessage(e))
        summary[clinicId] = { phase1: { error: toErrorMessage(e) }, phase2: {} }
      }
    }

    return ok({ message: 'Job ejecutado', clinics: clinics.length, summary })
  } catch (e) {
    console.error('[check-events] Fatal error:', e)
    return err(e instanceof Error ? e.message : 'Error en cron', 500)
  }
}

async function phase1_generateGroomingEvents(clinicId: string) {
  const results = { created: 0, skipped: 0, errors: 0 }

  let pets
  try {
    pets = await getPetsDueForGrooming(clinicId, REMINDER_DAYS_AHEAD + 1)
  } catch (e) {
    console.error(`[Phase 1][${clinicId}] Error al obtener mascotas:`, toErrorMessage(e))
    return results
  }

  for (const pet of pets) {
    try {
      const event = await scheduleGroomingEvent(pet)
      if (event) results.created++
      else results.skipped++
    } catch (e) {
      console.error(`[Phase 1][${clinicId}] Error en "${pet.name}":`, toErrorMessage(e))
      results.errors++
    }
  }

  return results
}

async function phase2_emitReminders(clinicId: string) {
  const results = { emitted: 0, errors: 0 }

  let events
  try {
    events = await getUpcomingPendingEvents(clinicId, REMINDER_DAYS_AHEAD)
  } catch (e) {
    console.error(`[Phase 2][${clinicId}] Error al obtener eventos:`, toErrorMessage(e))
    return results
  }

  for (const event of events) {
    try {
      const { data: petData } = await supabaseAdmin
        .from('pets')
        .select('id, name, type, user:clients(id, name, phone)')
        .eq('id', event.pet_id)
        .single()

      const pet    = petData as { id: string; name: string; type: string; user?: { id: string; name?: string; phone: string } } | null
      const client = pet?.user

      const context = {
        client_id:      client?.id,
        client_name:    client?.name,
        client_phone:   client?.phone ?? '',
        scheduled_date: event.scheduled_date,
      }

      if (event.type === 'grooming') {
        await emitPetGroomingDue(
          clinicId,
          { id: event.pet_id, name: pet?.name ?? '', type: pet?.type ?? '' },
          context
        )
      } else {
        await emitPetEventDue(
          clinicId,
          event.id,
          { id: event.pet_id, name: pet?.name ?? '' },
          { ...context, event_type: event.type }
        )
      }

      await markEventAsNotified(event.id)
      results.emitted++
    } catch (e) {
      console.error(`[Phase 2][${clinicId}] Fallo evento ${event.id}:`, toErrorMessage(e))
      results.errors++
    }
  }

  return results
}
