const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.message ?? 'API error')
  return json.data as T
}

export const api = {
  // Stats
  getStats: () =>
    request('/api/stats'),

  // Clients
  createClient: (body: { phone: string; name?: string }) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(body) }),

  getClient: (id: string) =>
    request(`/api/users/${id}`),

  getClientByPhone: (phone: string) =>
    request(`/api/users/phone/${encodeURIComponent(phone)}`),

  searchClients: (q: string) =>
    request(`/api/users/search?q=${encodeURIComponent(q)}`),

  // Pets
  createPet: (body: Record<string, unknown>) =>
    request('/api/pets', { method: 'POST', body: JSON.stringify(body) }),

  getPet: (id: string) =>
    request(`/api/pets/${id}`),

  getPetsByUser: (userId: string) =>
    request(`/api/pets/user/${userId}`),

  groomingCompleted: (petId: string, completed_date?: string) =>
    request(`/api/pets/${petId}/grooming-completed`, {
      method: 'PATCH',
      body: JSON.stringify({ completed_date }),
    }),

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
}
