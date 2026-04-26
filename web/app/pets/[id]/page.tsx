'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

// ─── Modal nuevo evento ───────────────────────────────────────────────────────
interface NewEventModalProps {
  petId: string
  onClose: () => void
  onCreated: () => void
}

function NewEventModal({ petId, onClose, onCreated }: NewEventModalProps) {
  const [type, setType]             = useState('vaccine')
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await api.createEvent({ pet_id: petId, type, scheduled_date: date })
      onCreated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear evento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">Nuevo evento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="vaccine">💉 Vacuna</option>
              <option value="checkup">🩺 Control</option>
              <option value="deworming">💊 Desparasitación</option>
              <option value="grooming">🛁 Baño</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha programada</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear evento'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

interface User {
  id: string
  phone: string
  name?: string
}

interface Pet {
  id: string
  name: string
  type: string
  birth_date?: string
  grooming_frequency_days?: number
  last_grooming_date?: string
  user: User
}

type EventStatus = 'PENDING' | 'NOTIFIED' | 'COMPLETED' | 'CANCELLED'
type EventType   = 'grooming' | 'vaccine' | 'checkup' | 'deworming'
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

interface VetEvent {
  id: string
  type: EventType
  scheduled_date: string
  status: EventStatus
}

interface Booking {
  id: string
  date: string
  time: string
  status: BookingStatus
  notes?: string
}

const PET_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾',
}

const PET_TYPE_LABEL: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  grooming: 'Baño', vaccine: 'Vacuna', checkup: 'Control', deworming: 'Desparasitación',
}

const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  PENDING: 'Pendiente', NOTIFIED: 'Notificado', COMPLETED: 'Completado', CANCELLED: 'Cancelado',
}

const EVENT_STATUS_COLOR: Record<EventStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  NOTIFIED:  'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', COMPLETED: 'Completado', CANCELLED: 'Cancelado',
}

const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now   = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 12) return `${months} mes${months !== 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  return `${years} año${years !== 1 ? 's' : ''}`
}

export default function PetDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const petId    = params.id as string

  const [pet, setPet]           = useState<Pet | null>(null)
  const [events, setEvents]     = useState<VetEvent[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [markingGrooming, setMarkingGrooming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [petData, eventsData, bookingsData] = await Promise.all([
        api.getPet(petId) as Promise<Pet>,
        api.getEventsByPet(petId) as Promise<VetEvent[]>,
        api.getBookingsByPet(petId) as Promise<Booking[]>,
      ])
      setPet(petData)
      setEvents(eventsData)
      setBookings(bookingsData)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar mascota')
    } finally {
      setLoading(false)
    }
  }, [petId])

  useEffect(() => { load() }, [load])

  const markGroomingCompleted = async () => {
    if (!pet) return
    setMarkingGrooming(true)
    try {
      await api.groomingCompleted(pet.id)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setMarkingGrooming(false)
    }
  }

  const handleEventAction = async (id: string, action: 'complete' | 'cancel') => {
    try {
      if (action === 'complete') await api.completeEvent(id)
      else await api.cancelEvent(id)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleBookingAction = async (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    try {
      if (action === 'confirm')  await api.confirmBooking(id)
      if (action === 'complete') await api.completeBooking(id)
      if (action === 'cancel')   await api.cancelBooking(id)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  if (loading) {
    return <p className="text-gray-400 text-sm mt-8">Cargando...</p>
  }

  if (error || !pet) {
    return (
      <div className="mt-8">
        <p className="text-red-500 text-sm mb-4">{error || 'Mascota no encontrada'}</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm hover:underline">← Volver</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {showNewEvent && (
        <NewEventModal
          petId={petId}
          onClose={() => setShowNewEvent(false)}
          onCreated={() => { setShowNewEvent(false); load() }}
        />
      )}

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/clients" className="hover:text-indigo-600">Clientes</Link>
        <span>›</span>
        <span className="text-gray-600">{pet.user.name ?? pet.user.phone}</span>
        <span>›</span>
        <span className="text-gray-800 font-medium">{pet.name}</span>
      </nav>

      {/* Card principal */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl leading-none">{PET_EMOJI[pet.type] ?? '🐾'}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{pet.name}</h2>
            <p className="text-gray-500 text-sm">{PET_TYPE_LABEL[pet.type] ?? pet.type}</p>

            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-gray-400">Dueño</span>
                <p className="font-medium">{pet.user.name ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-400">Teléfono</span>
                <p className="font-medium">{pet.user.phone}</p>
              </div>
              {pet.birth_date && (
                <div>
                  <span className="text-gray-400">Edad</span>
                  <p className="font-medium">{calcAge(pet.birth_date)}</p>
                </div>
              )}
              {pet.grooming_frequency_days && (
                <div>
                  <span className="text-gray-400">Frecuencia de baño</span>
                  <p className="font-medium">cada {pet.grooming_frequency_days} días</p>
                </div>
              )}
              {pet.last_grooming_date && (
                <div>
                  <span className="text-gray-400">Último baño</span>
                  <p className="font-medium">{pet.last_grooming_date}</p>
                </div>
              )}
            </div>

            {/* Botón baño completado */}
            {pet.grooming_frequency_days && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={markGroomingCompleted}
                  disabled={markingGrooming}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  🛁 {markingGrooming ? 'Guardando...' : 'Marcar baño completado hoy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Eventos */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            Eventos <span className="text-gray-400 font-normal text-sm">({events.length})</span>
          </h3>
          <button
            onClick={() => setShowNewEvent(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Nuevo evento
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {events.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin eventos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{EVENT_TYPE_LABEL[ev.type]}</td>
                    <td className="px-5 py-3 text-gray-600">{ev.scheduled_date}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${EVENT_STATUS_COLOR[ev.status]}`}>
                        {EVENT_STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {(ev.status === 'PENDING' || ev.status === 'NOTIFIED') && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEventAction(ev.id, 'complete')}
                            className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => handleEventAction(ev.id, 'cancel')}
                            className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Bookings */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">
          Historial de citas <span className="text-gray-400 font-normal text-sm">({bookings.length})</span>
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {bookings.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Sin citas registradas</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Hora</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Notas</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">{b.date}</td>
                    <td className="px-5 py-3 font-mono font-medium">{b.time}</td>
                    <td className="px-5 py-3 text-gray-500">{b.notes ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status]}`}>
                        {BOOKING_STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleBookingAction(b.id, 'confirm')}
                            className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Confirmar
                          </button>
                        )}
                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                          <>
                            <button
                              onClick={() => handleBookingAction(b.id, 'complete')}
                              className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                              Completar
                            </button>
                            <button
                              onClick={() => handleBookingAction(b.id, 'cancel')}
                              className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
