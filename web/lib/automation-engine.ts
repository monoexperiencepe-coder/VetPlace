import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveTemplate } from '@/lib/template-resolver'
import { evaluateCondition, type AutomationCondition } from '@/lib/condition-evaluator'
import { getMessageProvider } from '@/lib/messaging/provider-factory'
import { getNextAvailableSlots } from '@/lib/services/availabilityService'
import { detectIntent, formatSlotsMessage } from '@/lib/utils/message-intent'
import type { DomainEventType, DomainEventPayload } from '@/lib/domain-events'

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

export async function processUnhandledEvents(): Promise<{
  processed: number
  triggered: number
  errors:    number
}> {
  let processed = 0
  let triggered = 0
  let errors    = 0

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

      await supabaseAdmin
        .from('domain_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id)

      processed++
    } catch (e) {
      console.error(`[AutomationEngine] Error processing event ${event.id}:`, e)
      errors++
      await supabaseAdmin
        .from('domain_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', event.id)
    }
  }

  return { processed, triggered, errors }
}

async function executeAction(automation: Automation, event: DomainEvent): Promise<boolean> {
  switch (automation.action_type) {
    case 'send_message':
      if (event.type === 'message_received') {
        return sendMessageReceived(automation, event)
      }
      return sendMessage(automation, event)

    case 'create_event':
      return scheduleVetEvent(automation, event)

    case 'create_booking':
      console.log(`[AutomationEngine] create_booking not yet implemented for automation ${automation.id}`)
      return false

    default:
      return false
  }
}

async function sendMessage(automation: Automation, event: DomainEvent): Promise<boolean> {
  if (!automation.message_template) return false

  const phone = event.payload.client_phone
  if (!phone) {
    console.warn(`[AutomationEngine] send_message skipped — no client_phone in event ${event.id}`)
    return false
  }

  const body = resolveTemplate(automation.message_template, event.payload)

  if (automation.delay_minutes > 0) {
    const scheduledAt = new Date(Date.now() + automation.delay_minutes * 60 * 1000).toISOString()
    const { error } = await supabaseAdmin.from('notifications').insert({
      clinic_id:        event.clinic_id,
      phone,
      message:          body,
      status:           'scheduled',
      scheduled_at:     scheduledAt,
      source:           'automation',
      automation_id:    automation.id,
      domain_event_id:  event.id,
      created_at:       new Date().toISOString(),
    })
    if (error) {
      console.error(`[AutomationEngine] Failed to schedule notification for automation ${automation.id}:`, error)
      return false
    }
    return true
  }

  const provider = getMessageProvider('internal')
  const result = await provider.sendMessage({
    clinicId: event.clinic_id,
    to:       phone,
    body,
    metadata: { automation_id: automation.id, domain_event_id: event.id },
  })

  return result.status === 'sent'
}

async function sendMessageReceived(automation: Automation, event: DomainEvent): Promise<boolean> {
  const phone = event.payload.client_phone
  if (!phone) return false

  const incomingText = (event.payload.message as string) ?? ''
  const intent = detectIntent(incomingText)

  let body: string

  if (intent === 'confirm' || intent === 'request_slot') {
    const slots = await getNextAvailableSlots(event.clinic_id)
    body = formatSlotsMessage(slots)
  } else if (automation.message_template) {
    body = resolveTemplate(automation.message_template, event.payload)
  } else {
    return false
  }

  const provider = getMessageProvider('internal')
  const result = await provider.sendMessage({
    clinicId: event.clinic_id,
    to:       phone,
    body,
    metadata: { automation_id: automation.id, domain_event_id: event.id },
  })

  return result.status === 'sent'
}

async function scheduleVetEvent(automation: Automation, event: DomainEvent): Promise<boolean> {
  const petId = event.payload.pet_id
  if (!petId) return false

  const delayDays = Math.round(automation.delay_minutes / (60 * 24))
  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() + delayDays)
  const dateStr = eventDate.toISOString().split('T')[0]

  const eventType = (event.payload.event_type as string) ?? 'control'

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
