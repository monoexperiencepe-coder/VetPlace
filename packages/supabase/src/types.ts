// Shared base types used across all verticals.
// Each vertical extends these with industry-specific fields.

export interface Clinic {
  id: string
  name: string
  slug: string
  owner_id: string
  phone?: string
  email?: string
  address?: string
  logo_url?: string
  created_at: string
}

export interface Client {
  id: string
  clinic_id: string
  name: string
  phone: string
  email?: string
  address?: string
  district?: string
  notes?: string
  portal_token?: string
  created_at: string
}

export interface Pet {
  id: string
  clinic_id: string
  user_id: string   // client id
  name: string
  type: string
  breed?: string
  birth_date?: string
  grooming_every_days?: number
  created_at: string
}

export interface Booking {
  id: string
  clinic_id: string
  client_id: string
  pet_id?: string
  service_type_id?: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  payment_status?: 'pending' | 'paid'
  created_at: string
}
