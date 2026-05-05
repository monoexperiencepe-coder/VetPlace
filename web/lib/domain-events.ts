import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Tipos de eventos de dominio ──────────────────────────────────────────────
// Nota: NO confundir con la tabla 'events' (eventos veterinarios como vacunas/baños).
// domain_events son eventos del sistema que disparan automations.

export type DomainEventType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'client_created'
  | 'pet_grooming_due'   // emitido por el cron check-events
  | 'pet_event_due'      // emitido por el cron check-events (vacuna, control, etc.)

// Payload tipado por evento — lo que el automation engine puede usar en templates
export interface DomainEventPayload {
  // Datos del cliente
  client_id?:    string
  client_name?:  string
  client_phone?: string
  // Datos de la mascota
  pet_id?:       string
  pet_name?:     string
  pet_type?:     string
  // Datos del turno
  booking_id?:   string
  booking_date?: string  // YYYY-MM-DD
  booking_time?: string  // HH:MM
  booking_notes?: string
  // Datos del evento veterinario
  event_id?:          string
  event_type?:        string
  scheduled_date?:    string  // YYYY-MM-DD
  // Datos de pago
  payment_id?:   string
  amount?:       number
  method?:       string
  // Metadata
  [key: string]: unknown
}

// ─── Función principal ────────────────────────────────────────────────────────
/**
 * Emite un evento de dominio hacia la cola de procesamiento.
 * Fire-and-forget: nunca lanza un error para no romper la acción principal.
 * El automation engine lo procesará en el siguiente ciclo del cron.
 */
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
    // Log pero nunca relanzar — el evento de dominio es best-effort
    console.error(`[DomainEvent] Failed to emit ${type} for ${entityType}:${entityId}`, e)
  }
}

// ─── Helpers específicos para no repetir payload building ────────────────────

export async function emitBookingCreated(
  clinicId: string,
  booking: {
    id: string
    pet_id: string
    date: string
    time: string
    notes?: string
  },
  context: {
    client_id?:   string
    client_name?: string
    client_phone?: string
    pet_name?:    string
    pet_type?:    string
  }
) {
  await emitDomainEvent(clinicId, 'booking_created', 'booking', booking.id, {
    booking_id:   booking.id,
    booking_date: booking.date,
    booking_time: booking.time,
    booking_notes: booking.notes,
    pet_id:       booking.pet_id,
    ...context,
  })
}

export async function emitBookingCompleted(
  clinicId: string,
  booking: {
    id: string
    pet_id: string
    date: string
    time: string
  },
  context: {
    client_id?:   string
    client_name?: string
    client_phone?: string
    pet_name?:    string
    last_activity_at?: string  // para detectar inactividad en condition_json
  }
) {
  await emitDomainEvent(clinicId, 'booking_completed', 'booking', booking.id, {
    booking_id:       booking.id,
    booking_date:     booking.date,
    booking_time:     booking.time,
    pet_id:           booking.pet_id,
    last_activity_at: booking.date,  // la última actividad es hoy
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
  client: {
    id:    string
    name?: string
    phone: string
  }
) {
  await emitDomainEvent(clinicId, 'client_created', 'client', client.id, {
    client_id:    client.id,
    client_name:  client.name,
    client_phone: client.phone,
  })
}

export async function emitPaymentReceived(
  clinicId: string,
  payment: {
    id:         string
    amount:     number
    method:     string
    booking_id?: string
    client_id?:  string
    client_name?: string
    pet_name?:   string
  }
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
  pet: {
    id:    string
    name:  string
    type:  string
  },
  context: {
    client_id?:    string
    client_name?:  string
    client_phone?: string
    scheduled_date: string
  }
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
  context: {
    client_id?:    string
    client_name?:  string
    client_phone?: string
    scheduled_date: string
    event_type:    string
  }
) {
  await emitDomainEvent(clinicId, 'pet_event_due', 'event', eventId, {
    event_id: eventId,
    pet_id:   pet.id,
    pet_name: pet.name,
    fecha:    context.scheduled_date,
    ...context,
  })
}
