import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Tipos de eventos de dominio ──────────────────────────────────────────────
export type DomainEventType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'client_created'
  | 'pet_grooming_due'
  | 'pet_event_due'
  | 'message_received'

export interface DomainEventPayload {
  client_id?:      string
  client_name?:    string
  client_phone?:   string
  pet_id?:         string
  pet_name?:       string
  pet_type?:       string
  booking_id?:     string
  booking_date?:   string
  booking_time?:   string
  booking_notes?:  string
  event_id?:       string
  event_type?:     string
  scheduled_date?: string
  payment_id?:     string
  amount?:         number
  method?:         string
  conversation_id?: string
  message?:        string
  [key: string]: unknown
}

export async function emitDomainEvent(
  clinicId:   string,
  type:       DomainEventType,
  entityType: string,
  entityId:   string,
  payload:    DomainEventPayload
): Promise<void> {
  try {
    await supabaseAdmin.from('domain_events').insert({
      clinic_id:   clinicId,
      type,
      entity_type: entityType,
      entity_id:   entityId,
      payload,
      processed:   false,
    })
  } catch (e) {
    console.error(`[DomainEvent] Failed to emit ${type} for ${entityType}:${entityId}`, e)
  }
}

export async function emitBookingCreated(
  clinicId: string,
  booking: { id: string; pet_id: string; date: string; time: string; notes?: string },
  context: { client_id?: string; client_name?: string; client_phone?: string; pet_name?: string; pet_type?: string }
) {
  await emitDomainEvent(clinicId, 'booking_created', 'booking', booking.id, {
    booking_id:    booking.id,
    booking_date:  booking.date,
    booking_time:  booking.time,
    booking_notes: booking.notes,
    pet_id:        booking.pet_id,
    ...context,
  })
}

export async function emitBookingCompleted(
  clinicId: string,
  booking: { id: string; pet_id: string; date: string; time: string },
  context: { client_id?: string; client_name?: string; client_phone?: string; pet_name?: string; last_activity_at?: string }
) {
  await emitDomainEvent(clinicId, 'booking_completed', 'booking', booking.id, {
    booking_id:       booking.id,
    booking_date:     booking.date,
    booking_time:     booking.time,
    pet_id:           booking.pet_id,
    last_activity_at: booking.date,
    ...context,
  })
}

export async function emitBookingCancelled(
  clinicId: string,
  bookingId: string,
  context: { client_id?: string; client_name?: string; pet_name?: string }
) {
  await emitDomainEvent(clinicId, 'booking_cancelled', 'booking', bookingId, context)
}

export async function emitClientCreated(
  clinicId: string,
  client: { id: string; name?: string; phone: string }
) {
  await emitDomainEvent(clinicId, 'client_created', 'client', client.id, {
    client_id:    client.id,
    client_name:  client.name,
    client_phone: client.phone,
  })
}

export async function emitPaymentReceived(
  clinicId: string,
  payment: { id: string; amount: number; method: string; booking_id?: string; client_id?: string; client_name?: string; pet_name?: string }
) {
  await emitDomainEvent(clinicId, 'payment_received', 'payment', payment.id, {
    payment_id:  payment.id,
    amount:      payment.amount,
    method:      payment.method,
    booking_id:  payment.booking_id,
    client_id:   payment.client_id,
    client_name: payment.client_name,
    pet_name:    payment.pet_name,
  })
}

export async function emitPetGroomingDue(
  clinicId: string,
  pet: { id: string; name: string; type: string },
  context: { client_id?: string; client_name?: string; client_phone?: string; scheduled_date: string }
) {
  await emitDomainEvent(clinicId, 'pet_grooming_due', 'pet', pet.id, {
    pet_id:   pet.id,
    pet_name: pet.name,
    pet_type: pet.type,
    fecha:    context.scheduled_date,
    ...context,
  })
}

export async function emitPetEventDue(
  clinicId: string,
  eventId:  string,
  pet: { id: string; name: string },
  context: { client_id?: string; client_name?: string; client_phone?: string; scheduled_date: string; event_type: string }
) {
  await emitDomainEvent(clinicId, 'pet_event_due', 'event', eventId, {
    event_id: eventId,
    pet_id:   pet.id,
    pet_name: pet.name,
    fecha:    context.scheduled_date,
    ...context,
  })
}

export async function emitMessageReceived(
  clinicId:       string,
  conversationId: string,
  from:           string,
  message:        string,
  context: { client_id?: string; client_name?: string } = {}
) {
  await emitDomainEvent(clinicId, 'message_received', 'conversation', conversationId, {
    conversation_id: conversationId,
    client_phone:    from,
    message,
    ...context,
  })
}
