import type { DomainEventPayload } from '@/lib/domain-events'

/**
 * Resuelve un template de mensaje reemplazando variables {key} con valores del payload.
 *
 * Variables soportadas (todas opcionales — si no existen se dejan en blanco):
 *   {client_name}    {client_phone}
 *   {pet_name}       {pet_type}
 *   {booking_date}   {booking_time}   {booking_notes}
 *   {payment_id}     {amount}         {method}
 *   {event_type}     {scheduled_date} {fecha}
 *   {booking_id}     {pet_id}         {client_id}
 */
export function resolveTemplate(template: string, payload: DomainEventPayload): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = payload[key]
    if (value === null || value === undefined) return ''
    return String(value)
  })
}
