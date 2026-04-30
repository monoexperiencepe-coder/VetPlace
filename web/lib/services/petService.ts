import { supabaseAdmin } from '@/lib/supabase-admin'
import { handleSupabaseError, NotFoundError } from '@/lib/errors'
import { nextEventDate, todayUTC, addDays } from '@/lib/date-utils'
import { completeDueGroomingEventsForPet, scheduleGroomingEvent } from '@/lib/services/eventService'
import type { Pet, CreatePetDTO, PetWithUser } from '@/lib/types'

export interface GroomingCompletedResult {
  pet: Pet
  grooming_events_completed: number
  next_grooming_event_created: boolean
}

export async function getPetWithUser(petId: string, clinicId: string): Promise<PetWithUser> {
  const { data, error } = await supabaseAdmin
    .from('pets')
    .select(`*, user:clients (*)`)
    .eq('id', petId)
    .eq('clinic_id', clinicId)
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Pet', petId)
  return data as PetWithUser
}

export async function getPetsByUser(userId: string, clinicId: string): Promise<Pet[]> {
  const { data, error } = await supabaseAdmin
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })

  if (error) handleSupabaseError(error)
  return (data ?? []) as Pet[]
}

export async function getPetsDueForGrooming(clinicId: string, lookaheadDays = 3): Promise<Pet[]> {
  const { data, error } = await supabaseAdmin
    .from('pets')
    .select('*')
    .eq('clinic_id', clinicId)
    .not('grooming_frequency_days', 'is', null)
    .not('last_grooming_date', 'is', null)

  if (error) handleSupabaseError(error)

  const pets = (data ?? []) as Pet[]
  const cutoff = addDays(todayUTC(), lookaheadDays)

  return pets.filter((pet) => {
    const next = nextEventDate(pet.last_grooming_date!, pet.grooming_frequency_days!)
    return next <= cutoff
  })
}

export async function createPet(dto: CreatePetDTO): Promise<Pet> {
  const { data, error } = await supabaseAdmin
    .from('pets')
    .insert({ ...dto, created_at: new Date().toISOString() })
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as Pet
}

export async function recordGroomingCompleted(
  petId: string,
  clinicId: string,
  completedDate: string = todayUTC()
): Promise<GroomingCompletedResult> {
  const { data, error } = await supabaseAdmin
    .from('pets')
    .update({ last_grooming_date: completedDate, updated_at: new Date().toISOString() })
    .eq('id', petId)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Pet', petId)
  const pet = data as Pet

  const grooming_events_completed = await completeDueGroomingEventsForPet(
    petId,
    clinicId,
    completedDate
  )

  const nextEvent = await scheduleGroomingEvent(pet)

  return {
    pet,
    grooming_events_completed,
    next_grooming_event_created: nextEvent !== null,
  }
}
