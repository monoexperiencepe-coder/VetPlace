import { supabase } from '../config/supabase'
import { handleSupabaseError, NotFoundError, AppError } from '../utils/errors'
import { markEventAsCompleted } from './eventService'
import type { Booking, BookingStatus, CreateBookingDTO } from '../types'

export async function getBookingById(bookingId: string, clinicId: string): Promise<Booking> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('pet_id', petId)
    .eq('clinic_id', clinicId)
    .order('date', { ascending: false })

  if (error) handleSupabaseError(error)
  return (data ?? []) as Booking[]
}

export async function getBookingsByDate(date: string, clinicId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, pet:pets (id, name, type)`)
    .eq('date', date)
    .eq('clinic_id', clinicId)
    .in('status', ['PENDING', 'CONFIRMED'])
    .order('time', { ascending: true })

  if (error) handleSupabaseError(error)
  return (data ?? []) as Booking[]
}

export async function hasConflict(date: string, time: string, clinicId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('date', date)
    .eq('time', time)
    .eq('clinic_id', clinicId)
    .in('status', ['PENDING', 'CONFIRMED'])

  if (error) handleSupabaseError(error)
  return (count ?? 0) > 0
}

export async function createBooking(dto: CreateBookingDTO): Promise<Booking> {
  const conflict = await hasConflict(dto.date, dto.time, dto.clinic_id)
  if (conflict) {
    throw new AppError(`Slot ${dto.date} ${dto.time} ya está ocupado`, 'SLOT_CONFLICT', 409)
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...dto, status: 'PENDING', created_at: new Date().toISOString() })
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as Booking
}

export async function confirmBooking(bookingId: string, clinicId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, clinicId, 'CONFIRMED')
}

export async function cancelBooking(bookingId: string, clinicId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, clinicId, 'CANCELLED')
}

export async function completeBooking(bookingId: string, clinicId: string): Promise<Booking> {
  const booking = await updateBookingStatus(bookingId, clinicId, 'COMPLETED')
  if (booking.event_id) await markEventAsCompleted(booking.event_id)
  return booking
}

async function updateBookingStatus(
  bookingId: string,
  clinicId: string,
  status: BookingStatus
): Promise<Booking> {
  const { data, error } = await supabase
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
