import { createClient } from '@/lib/supabase'

const BASE = ''

/** Obtiene el access token de Supabase si hay sesión activa */
async function getToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> ?? {}) },
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.message ?? json.error ?? 'API error')
  return json.data as T
}

export interface GroomingCompletedMeta {
  grooming_events_completed: number
  next_grooming_event_created: boolean
}

export interface Conversation {
  id:              string
  clinic_id:       string
  client_id:       string | null
  phone:           string
  client_name:     string | null
  bot_active:      boolean
  unread_count:    number
  last_message:    string | null
  last_message_at: string | null
  created_at:      string
}

export interface Message {
  id:              string
  conversation_id: string
  from_type:       'client' | 'bot' | 'staff'
  body:            string
  created_at:      string
}

export const api = {
  // Stats
  getStats: () =>
    request('/api/stats'),

  // Recent clients
  getRecentClients: () =>
    request('/api/users/recent'),

  // Search pets by name
  searchPets: (q: string) =>
    request(`/api/pets/search?q=${encodeURIComponent(q)}`),

  // Clinics
  setupClinic: (body: { name: string; phone?: string; email?: string }) =>
    request('/api/clinics/setup', { method: 'POST', body: JSON.stringify(body) }),

  getMyClinic: () =>
    request('/api/clinics/me'),

  updateMyClinic: (body: Record<string, string>) =>
    request('/api/clinics/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // Clients
  createClient: (body: { phone: string; name?: string; email?: string; address?: string; distrito?: string; notes?: string }) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(body) }),

  updateClient: (id: string, body: { name?: string; email?: string; address?: string; distrito?: string; notes?: string; phone?: string }) =>
    request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteClient: (id: string) =>
    request(`/api/users/${id}`, { method: 'DELETE' }),

  getClient: (id: string) =>
    request(`/api/users/${id}`),

  getClientByPhone: (phone: string) =>
    request(`/api/users/phone/${encodeURIComponent(phone)}`),

  searchClients: (q: string) =>
    request(`/api/users/search?q=${encodeURIComponent(q)}`),

  // Pets
  createPet: (body: Record<string, unknown>) =>
    request('/api/pets', { method: 'POST', body: JSON.stringify(body) }),

  updatePet: (id: string, body: { name?: string; type?: string; breed?: string; birth_date?: string; grooming_frequency_days?: number | null }) =>
    request(`/api/pets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deletePet: (id: string) =>
    request(`/api/pets/${id}`, { method: 'DELETE' }),

  getPet: (id: string) =>
    request(`/api/pets/${id}`),

  getPetsByUser: (userId: string) =>
    request(`/api/pets/user/${userId}`),

  groomingCompleted: async (
    petId: string,
    completed_date?: string
  ): Promise<{ pet: unknown; meta?: GroomingCompletedMeta }> => {
    const token = await getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`/api/pets/${petId}/grooming-completed`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ completed_date }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.message ?? 'API error')
    return { pet: json.data, meta: json.meta as GroomingCompletedMeta | undefined }
  },

  isSlotAvailable: (date: string, time: string) =>
    request<{ available: boolean }>(
      `/api/bookings/slot-available?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
    ),

  // Events
  getEventsByPet: (petId: string) =>
    request(`/api/events/pet/${petId}`),

  getEvents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request(`/api/events${qs}`)
  },

  createEvent: (body: Record<string, unknown>) =>
    request('/api/events', { method: 'POST', body: JSON.stringify(body) }),

  cancelEvent: (id: string) =>
    request(`/api/events/${id}/cancel`, { method: 'PATCH' }),

  completeEvent: (id: string) =>
    request(`/api/events/${id}/complete`, { method: 'PATCH' }),

  // Bookings
  getBookingsByPet: (petId: string) =>
    request(`/api/bookings/pet/${petId}`),

  getBookings: (date: string) =>
    request(`/api/bookings?date=${date}`),

  createBooking: (body: Record<string, unknown>) =>
    request('/api/bookings', { method: 'POST', body: JSON.stringify(body) }),

  confirmBooking: (id: string) =>
    request(`/api/bookings/${id}/confirm`, { method: 'PATCH' }),

  cancelBooking: (id: string) =>
    request(`/api/bookings/${id}/cancel`, { method: 'PATCH' }),

  completeBooking: (id: string) =>
    request(`/api/bookings/${id}/complete`, { method: 'PATCH' }),

  // Conversations (chats)
  getConversations: () =>
    request<Conversation[]>('/api/conversations'),

  createConversation: (body: { phone: string; client_name?: string; client_id?: string }) =>
    request<Conversation>('/api/conversations', { method: 'POST', body: JSON.stringify(body) }),

  toggleBot: (id: string, bot_active: boolean) =>
    request(`/api/conversations/${id}/bot`, { method: 'PATCH', body: JSON.stringify({ bot_active }) }),

  markRead: (id: string) =>
    request(`/api/conversations/${id}/read`, { method: 'PATCH' }),

  // Messages
  getMessages: (conversationId: string) =>
    request<Message[]>(`/api/messages/${conversationId}`),

  sendMessage: (conversationId: string, body: string) =>
    request<Message>(`/api/messages/${conversationId}`, { method: 'POST', body: JSON.stringify({ body }) }),
}
