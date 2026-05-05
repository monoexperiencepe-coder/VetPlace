import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveTemplate } from '@/lib/template-resolver'
import { evaluateCondition, type AutomationCondition } from '@/lib/condition-evaluator'
import type { DomainEventType, DomainEventPayload } from '@/lib/domain-events'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DomainEvent {
  id:          string
  clinic_id:   string
  type:        DomainEventType
  entity_type: string
  entity_id:   string
  payload:     DomainEventPayload
  processed:   boolean
  created_at:  string
}

interface Automation {
  id:               string
  clinic_id:        string
  name:             string
  trigger_event:    DomainEventType
  condition_json:   AutomationCondition | null
  action_type:      'send_message' | 'create_booking' | 'create_event'
  message_template: string | null
  delay_minutes:    number
  active:           boolean
}

// ─── Procesador principal ─────────────────────────────────────────────────────

/**
 * Procesa todos los domain_events no procesados para todas las clínicas.
 * Llamado desde el cron /api/cron/process-events.
 *
 * @returns Resumen { processed, triggered, errors }
 */
export async function processUnhandledEvents(): Promise<{
  processed: number
  triggered: number
  errors:    number
}> {
  let processed = 0
  let triggered = 0
  let errors    = 0

  // 1. Cargar eventos pendientes (máx 100 por ciclo para no saturar el cron)
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('domain_events')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(100)

  if (eventsError) {
    console.error('[AutomationEngine] Failed to fetch domain_events:', eventsError)
    return { processed, triggered, errors: 1 }
  }

  if (!events || events.length === 0) return { processed, triggered, errors }

  // 2. Cargar todas las automations activas de las clínicas involucradas
  const clinicIds = [...new Set((events as DomainEvent[]).map(e => e.clinic_id))]

  const { data: automations, error: autError } = await supabaseAdmin
    .from('automations')
    .select('*')
    .in('clinic_id', clinicIds)
    .eq('active', true)

  if (autError) {
    console.error('[AutomationEngine] Failed to fetch automations:', autError)
    return { processed, triggered, errors: 1 }
  }

  const activeAutomations = (automations ?? []) as Automation[]

  // 3. Procesar cada evento
  for (const event of events as DomainEvent[]) {
    try {
      const matches = activeAutomations.filter(
        a => a.clinic_id === event.clinic_id && a.trigger_event === event.type
      )

      for (const automation of matches) {
        const passes = evaluateCondition(automation.condition_json, event.payload)
        if (!passes) continue

        const result = await executeAction(automation, event)
        if (result) triggered++
      }

      // Marcar evento como procesado
      await supabaseAdmin
        .from('domain_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id)

      processed++
    } catch (e) {
      console.error(`[AutomationEngine] Error processing event ${event.id}:`, e)
      errors++
      // Marcar como procesado igual para evitar ciclos infinitos en eventos con error
      await supabaseAdmin
        .from('domain_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id)
    }
  }

  return { processed, triggered, errors }
}

// ─── Ejecutor de acciones ─────────────────────────────────────────────────────

async function executeAction(automation: Automation, event: DomainEvent): Promise<boolean> {
  switch (automation.action_type) {
    case 'send_message':
      return sendMessage(automation, event)

    case 'create_event':
      return scheduleVetEvent(automation, event)

    case 'create_booking':
      // Pendiente: lógica para crear pre-booking automático
      console.log(`[AutomationEngine] create_booking action not yet implemented for automation ${automation.id}`)
      return false

    default:
      return false
  }
}

// ─── send_message ─────────────────────────────────────────────────────────────

async function sendMessage(automation: Automation, event: DomainEvent): Promise<boolean> {
  if (!automation.message_template) return false

  const phone = event.payload.client_phone
  if (!phone) {
    console.warn(`[AutomationEngine] send_message skipped — no client_phone in event ${event.id}`)
    return false
  }

  const message = resolveTemplate(automation.message_template, event.payload)

  // Calcular scheduled_at respetando el delay_minutes
  const scheduledAt = new Date(Date.now() + automation.delay_minutes * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin.from('notifications').insert({
    clinic_id:    event.clinic_id,
    phone,
    message,
    status:       automation.delay_minutes > 0 ? 'scheduled' : 'pending',
    scheduled_at: scheduledAt,
    source:       'automation',
    automation_id: automation.id,
    domain_event_id: event.id,
    created_at:   new Date().toISOString(),
  })

  if (error) {
    console.error(`[AutomationEngine] Failed to insert notification for automation ${automation.id}:`, error)
    return false
  }

  return true
}

// ─── create_event (vet event) ─────────────────────────────────────────────────

async function scheduleVetEvent(automation: Automation, event: DomainEvent): Promise<boolean> {
  const petId = event.payload.pet_id
  if (!petId) return false

  // Calcular fecha del evento a partir de hoy + delay_minutes convertido a días
  const delayDays = Math.round(automation.delay_minutes / (60 * 24))
  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() + delayDays)
  const dateStr = eventDate.toISOString().split('T')[0]

  // Determinar tipo de evento desde el template o el payload
  const eventType = event.payload.event_type as string ?? 'control'

  const { error } = await supabaseAdmin.from('events').insert({
    clinic_id:      event.clinic_id,
    pet_id:         petId,
    type:           eventType,
    scheduled_date: dateStr,
    notes:          automation.message_template
      ? resolveTemplate(automation.message_template, event.payload)
      : null,
    status:         'pending',
    created_at:     new Date().toISOString(),
  })

  if (error) {
    console.error(`[AutomationEngine] Failed to create vet event for automation ${automation.id}:`, error)
    return false
  }

  return true
}
