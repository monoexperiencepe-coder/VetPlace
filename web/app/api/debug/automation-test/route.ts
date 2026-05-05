import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, err, handleRouteError } from '@/lib/api-response'
import { emitDomainEvent, type DomainEventType } from '@/lib/domain-events'
import { processUnhandledEvents } from '@/lib/automation-engine'

/**
 * POST /api/debug/automation-test
 *
 * Solo disponible en desarrollo. Permite:
 *   1. Emitir un domain event manualmente
 *   2. Correr el automation engine inmediatamente
 *   3. Ver qué notificaciones se generaron
 *
 * Body:
 *   {
 *     event_type: DomainEventType,   // ej: "booking_created"
 *     payload: { client_name, client_phone, pet_name, booking_date, booking_time, ... }
 *   }
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return err('Not available in production', 403)
  }

  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json()
    const { event_type, payload = {} } = body as {
      event_type: DomainEventType
      payload: Record<string, unknown>
    }

    if (!event_type) return err('event_type is required', 400)

    // 1. Emitir el evento
    await emitDomainEvent(clinicId, event_type, 'debug', crypto.randomUUID(), {
      ...payload,
      _debug: true,
    })

    // 2. Correr el engine ahora mismo
    const engineResult = await processUnhandledEvents()

    // 3. Leer las notificaciones generadas en los últimos 30 segundos
    const since = new Date(Date.now() - 30_000).toISOString()
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('id, phone, message, status, scheduled_at, automation_id')
      .eq('clinic_id', clinicId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    return ok({
      event_emitted: event_type,
      engine: engineResult,
      notifications_created: notifications ?? [],
    })
  } catch (e) {
    return handleRouteError(e)
  }
}

/**
 * GET /api/debug/automation-test
 * Muestra el estado actual: eventos pendientes + automations activas + últimas notificaciones
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return err('Not available in production', 403)
  }

  try {
    const { clinicId } = await getAuthContext(request)

    const [eventsRes, automationsRes, notificationsRes] = await Promise.all([
      supabaseAdmin
        .from('domain_events')
        .select('id, type, entity_type, processed, created_at, payload')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(20),

      supabaseAdmin
        .from('automations')
        .select('id, name, trigger_event, active, action_type')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true }),

      supabaseAdmin
        .from('notifications')
        .select('id, phone, message, status, created_at')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    return ok({
      domain_events:  eventsRes.data  ?? [],
      automations:    automationsRes.data ?? [],
      notifications:  notificationsRes.data ?? [],
      pending_events: (eventsRes.data ?? []).filter((e: { processed: boolean }) => !e.processed).length,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
