import { supabase } from '../config/supabase'
import { handleSupabaseError, NotFoundError } from '../utils/errors'
import { todayUTC, addDays, nextEventDate } from '../utils/dateUtils'
import type { Event, EventType, EventStatus, CreateEventDTO, EventWithPetAndUser, Pet } from '../types'

export async function getUpcomingPendingEvents(
  clinicId: string,
  daysAhead = 2
): Promise<EventWithPetAndUser[]> {
  const targetDate = addDays(todayUTC(), daysAhead)

  const { data, error } = await supabase
    .from('events')
    .select(`*, pet:pets (*, user:clients (*))`)
    .eq('clinic_id', clinicId)
    .eq('status', 'PENDING')
    .lte('scheduled_date', targetDate)
    .gte('scheduled_date', todayUTC())
    .order('scheduled_date', { ascending: true })

  if (error) handleSupabaseError(error)
  return (data ?? []) as EventWithPetAndUser[]
}

export async function getEventsByPet(
  petId: string,
  clinicId: string,
  status?: EventStatus
): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('pet_id', petId)
    .eq('clinic_id', clinicId)
    .order('scheduled_date', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) handleSupabaseError(error)
  return (data ?? []) as Event[]
}

export async function hasActiveEventNear(
  petId: string,
  type: EventType,
  date: string,
  windowDays = 5
): Promise<boolean> {
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('type', type)
    .in('status', ['PENDING', 'NOTIFIED'])
    .gte('scheduled_date', addDays(date, -windowDays))
    .lte('scheduled_date', addDays(date, windowDays))

  if (error) handleSupabaseError(error)
  return (count ?? 0) > 0
}

export async function createEvent(dto: CreateEventDTO): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...dto, status: 'PENDING', created_at: new Date().toISOString() })
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as Event
}

/** Marca como completados los eventos de baño pendientes/notificados hasta esa fecha (inclusive). */
export async function completeDueGroomingEventsForPet(
  petId: string,
  clinicId: string,
  upToDate: string
): Promise<number> {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
    .eq('pet_id', petId)
    .eq('clinic_id', clinicId)
    .eq('type', 'grooming')
    .in('status', ['PENDING', 'NOTIFIED'])
    .lte('scheduled_date', upToDate)
    .select('id')

  if (error) handleSupabaseError(error)
  return (data ?? []).length
}

export async function scheduleGroomingEvent(pet: Pet): Promise<Event | null> {
  if (!pet.last_grooming_date || !pet.grooming_frequency_days) return null

  const scheduledDate = nextEventDate(pet.last_grooming_date, pet.grooming_frequency_days)
  const exists = await hasActiveEventNear(pet.id, 'grooming', scheduledDate)
  if (exists) return null

  return createEvent({
    clinic_id: pet.clinic_id,
    pet_id: pet.id,
    type: 'grooming',
    scheduled_date: scheduledDate,
  })
}

export async function markEventAsNotified(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'NOTIFIED',
      notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Event', eventId)
  return data as Event
}

export async function markEventAsCompleted(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Event', eventId)
  return data as Event
}

export async function cancelEvent(eventId: string, clinicId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Event', eventId)
  return data as Event
}
