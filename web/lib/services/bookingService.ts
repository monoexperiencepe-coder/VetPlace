import { supabaseAdmin } from '@/lib/supabase-admin'
import { handleSupabaseError, NotFoundError, AppError } from '@/lib/errors'
import { markEventAsCompleted } from '@/lib/services/eventService'
import {
  emitBookingCreated,
  emitBookingCompleted,
  emitBookingCancelled,
} from '@/lib/domain-events'
import type { Booking, BookingStatus, CreateBookingDTO } from '@/lib/types'

export async function getBookingById(bookingId: string, clinicId: string): Promise<Booking> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('clinic_id', clinicId)
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Booking', bookingId)
  return data as Booking
}

export async function getBookingsByPet(petId: string, clinicId: string): Promise<Booking[]> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('pet_id', petId)
    .eq('clinic_id', clinicId)
    .order('date', { ascending: false })

  if (error) handleSupabaseError(error)
  return (data ?? []) as Booking[]
}

export async function getBookingsByDate(date: string, clinicId: string): Promise<Booking[]> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`*, pet:pets (id, name, type, user:clients (id, name, phone)), service:service_types (id, name, price), staff:staff_members (id, name, color)`)
    .eq('date', date)
    .eq('clinic_id', clinicId)
    .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED'])
    .order('time', { ascending: true })

  if (error) handleSupabaseError(error)
  return (data ?? []) as Booking[]
}

export async function getAllBookings(clinicId: string, limit = 200): Promise<Booking[]> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`*, pet:pets (id, name, type, user:clients (id, name, phone))`)
    .eq('clinic_id', clinicId)
    .order('date', { ascending: false })
    .order('time', { ascending: true })
    .limit(limit)

  if (error) handleSupabaseError(error)
  return (data ?? []) as Booking[]
}

export async function hasConflict(date: string, time: string, clinicId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('date', date)
    .eq('time', time)
    .eq('clinic_id', clinicId)
    .in('status', ['PENDING', 'CONFIRMED'])

  if (error) handleSupabaseError(error)
  return (count ?? 0) > 0
}

export async function isSlotAvailable(date: string, time: string, clinicId: string): Promise<boolean> {
  return !(await hasConflict(date, time, clinicId))
}

export async function createBooking(dto: CreateBookingDTO): Promise<Booking> {
  const conflict = await hasConflict(dto.date, dto.time, dto.clinic_id)
  if (conflict) {
    throw new AppError(`Slot ${dto.date} ${dto.time} ya está ocupado`, 'SLOT_CONFLICT', 409)
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert({ ...dto, status: 'PENDING', created_at: new Date().toISOString() })
    .select(`*, pet:pets (id, name, type, user:clients (id, name, phone))`)
    .single()

  if (error) handleSupabaseError(error)
  const booking = data as Booking & {
    pet?: { id: string; name: string; type: string; user?: { id: string; name?: string; phone: string } }
  }

  await emitBookingCreated(dto.clinic_id, {
    id:    booking.id,
    pet_id: booking.pet_id,
    date:  booking.date,
    time:  booking.time,
    notes: booking.notes,
  }, {
    client_id:    booking.pet?.user?.id,
    client_name:  booking.pet?.user?.name,
    client_phone: booking.pet?.user?.phone,
    pet_name:     booking.pet?.name,
    pet_type:     booking.pet?.type,
  })

  return booking as Booking
}

export async function confirmBooking(bookingId: string, clinicId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, clinicId, 'CONFIRMED')
}

export async function cancelBooking(bookingId: string, clinicId: string): Promise<Booking> {
  const booking = await updateBookingStatus(bookingId, clinicId, 'CANCELLED')
  await emitBookingCancelled(clinicId, booking.id, {})
  return booking
}

export async function completeBooking(bookingId: string, clinicId: string): Promise<Booking> {
  const booking = await updateBookingStatus(bookingId, clinicId, 'COMPLETED')
  if (booking.event_id) await markEventAsCompleted(booking.event_id)

  const { data: full } = await supabaseAdmin
    .from('bookings')
    .select(`pet:pets (id, name, type, user:clients (id, name, phone))`)
    .eq('id', bookingId)
    .single()

  const ctx = full as unknown as {
    pet?: { id: string; name: string; type: string; user?: { id: string; name?: string; phone: string } }
  }

  // Fire-and-forget: don't block the API response waiting for domain events/automations
  emitBookingCompleted(clinicId, {
    id:     booking.id,
    pet_id: booking.pet_id,
    date:   booking.date,
    time:   booking.time,
  }, {
    client_id:        ctx?.pet?.user?.id,
    client_name:      ctx?.pet?.user?.name,
    client_phone:     ctx?.pet?.user?.phone,
    pet_name:         ctx?.pet?.name,
    last_activity_at: booking.date,
  }).catch(err => console.error('[completeBooking] emitBookingCompleted error:', err))

  return booking
}

async function updateBookingStatus(
  bookingId: string,
  clinicId: string,
  status: BookingStatus
): Promise<Booking> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Booking', bookingId)
  return data as Booking
}
