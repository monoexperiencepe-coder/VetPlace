export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
export type EventType = 'grooming' | 'vaccine' | 'checkup' | 'deworming'
export type EventStatus = 'PENDING' | 'NOTIFIED' | 'COMPLETED' | 'CANCELLED'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface Clinic {
  id: string
  name: string
  slug: string
  phone?: string
  email?: string
  created_at: string
  updated_at?: string
}

export interface User {
  id: string
  clinic_id: string
  phone: string
  name?: string
  created_at: string
  updated_at?: string
}

export interface Pet {
  id: string
  clinic_id: string
  user_id: string
  name: string
  type: PetType
  birth_date?: string
  grooming_frequency_days?: number
  last_grooming_date?: string
  created_at: string
  updated_at?: string
}

export interface Event {
  id: string
  clinic_id: string
  pet_id: string
  type: EventType
  scheduled_date: string
  status: EventStatus
  notified_at?: string
  created_at: string
  updated_at?: string
}

export interface Booking {
  id: string
  clinic_id: string
  pet_id: string
  event_id?: string
  date: string
  time: string
  status: BookingStatus
  notes?: string
  created_at: string
  updated_at?: string
}

export interface CreatePetDTO {
  clinic_id: string
  user_id: string
  name: string
  type: PetType
  birth_date?: string
  grooming_frequency_days?: number
}

export interface CreateEventDTO {
  clinic_id: string
  pet_id: string
  type: EventType
  scheduled_date: string
}

export interface CreateBookingDTO {
  clinic_id: string
  pet_id: string
  event_id?: string
  date: string
  time: string
  notes?: string
}

export interface PetWithUser extends Pet {
  user: User
}

export interface EventWithPetAndUser extends Event {
  pet: PetWithUser
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }
