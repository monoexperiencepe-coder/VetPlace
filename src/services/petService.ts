import { supabase } from '../config/supabase'
import { handleSupabaseError, NotFoundError } from '../utils/errors'
import { nextEventDate, todayUTC } from '../utils/dateUtils'
import type { Pet, CreatePetDTO, PetWithUser } from '../types'

export async function getPetWithUser(petId: string, clinicId: string): Promise<PetWithUser> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })

  if (error) handleSupabaseError(error)
  return (data ?? []) as Pet[]
}

export async function getPetsDueForGrooming(clinicId: string, lookaheadDays = 3): Promise<Pet[]> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .update({ last_grooming_date: completedDate, updated_at: new Date().toISOString() })
    .eq('id', petId)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('Pet', petId)
  return data as Pet
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
