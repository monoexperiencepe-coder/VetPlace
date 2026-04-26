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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: '#fef9c3', text: '#854d0e' },
  NOTIFIED:  { bg: '#dbeafe', text: '#1e40af' },
  CONFIRMED: { bg: '#dbeafe', text: '#1e40af' },
  COMPLETED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#f1f5f9', text: '#64748b' },
}

const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', COMPLETED: 'Completado', CANCELLED: 'Cancelado',
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
    return <p className="text-sm mt-8" style={{ color: '#94a3b8' }}>Cargando...</p>
  }

  if (error || !pet) {
    return (
      <div className="mt-8">
        <p className="text-red-500 text-sm mb-4">{error || 'Mascota no encontrada'}</p>
        <button onClick={() => router.back()} className="text-sm font-medium" style={{ color: 'var(--blue)' }}>← Volver</button>
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
      <nav className="text-xs mb-5 flex items-center gap-2" style={{ color: '#94a3b8' }}>
        <Link href="/clients" className="hover:underline">Clientes</Link>
        <span>›</span>
        <span>{pet.user.name ?? pet.user.phone}</span>
        <span>›</span>
        <span className="font-semibold" style={{ color: '#334155' }}>{pet.name}</span>
      </nav>

      {/* Card principal */}
      <div className="rounded-2xl p-6 mb-5" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
        <div className="flex items-start gap-4">
          <div className="text-5xl leading-none">{PET_EMOJI[pet.type] ?? '🐾'}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-0.5" style={{ color: '#0f172a' }}>{pet.name}</h2>
            <p className="text-sm" style={{ color: '#64748b' }}>{PET_TYPE_LABEL[pet.type] ?? pet.type}</p>

            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <InfoItem label="Dueño"          value={pet.user.name ?? '—'} />
              <InfoItem label="Teléfono"       value={pet.user.phone} />
              {pet.birth_date        && <InfoItem label="Edad"               value={calcAge(pet.birth_date)} />}
              {pet.grooming_frequency_days && <InfoItem label="Frecuencia de baño" value={`cada ${pet.grooming_frequency_days} días`} />}
              {pet.last_grooming_date && <InfoItem label="Último baño"       value={pet.last_grooming_date} />}
            </div>

            {/* Botón baño completado */}
            {pet.grooming_frequency_days && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f0f4ff' }}>
                <button
                  onClick={markGroomingCompleted}
                  disabled={markingGrooming}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                  style={{ background: '#0d9488' }}
                >
                  🛁 {markingGrooming ? 'Guardando...' : 'Marcar baño completado hoy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Eventos */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>
            Eventos <span className="font-normal" style={{ color: '#94a3b8' }}>({events.length})</span>
          </h3>
          <button
            onClick={() => setShowNewEvent(true)}
            className="text-xs font-semibold"
            style={{ color: 'var(--blue)' }}
          >
            + Nuevo evento
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
          {events.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>Sin eventos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8faff', borderBottom: '1px solid #e4ebff' }}>
                <tr>
                  {['Tipo', 'Fecha', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr
                    key={ev.id}
                    style={{ borderTop: i > 0 ? '1px solid #f0f4ff' : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3.5 font-semibold" style={{ color: '#334155' }}>{EVENT_TYPE_LABEL[ev.type]}</td>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#64748b' }}>{ev.scheduled_date}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: STATUS_COLORS[ev.status].bg, color: STATUS_COLORS[ev.status].text }}
                      >
                        {EVENT_STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(ev.status === 'PENDING' || ev.status === 'NOTIFIED') && (
                        <div className="flex gap-2 justify-end">
                          <Btn onClick={() => handleEventAction(ev.id, 'complete')} variant="green">Completar</Btn>
                          <Btn onClick={() => handleEventAction(ev.id, 'cancel')} variant="ghost">Cancelar</Btn>
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
        <h3 className="font-semibold text-sm mb-3" style={{ color: '#0f172a' }}>
          Historial de citas <span className="font-normal" style={{ color: '#94a3b8' }}>({bookings.length})</span>
        </h3>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
          {bookings.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>Sin citas registradas</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8faff', borderBottom: '1px solid #e4ebff' }}>
                <tr>
                  {['Fecha', 'Hora', 'Notas', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr
                    key={b.id}
                    style={{ borderTop: i > 0 ? '1px solid #f0f4ff' : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#64748b' }}>{b.date}</td>
                    <td className="px-5 py-3.5 font-mono font-bold" style={{ color: '#0f172a' }}>{b.time}</td>
                    <td className="px-5 py-3.5" style={{ color: '#94a3b8' }}>{b.notes ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: STATUS_COLORS[b.status].bg, color: STATUS_COLORS[b.status].text }}
                      >
                        {BOOKING_STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'PENDING' && (
                          <Btn onClick={() => handleBookingAction(b.id, 'confirm')} variant="blue">Confirmar</Btn>
                        )}
                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                          <>
                            <Btn onClick={() => handleBookingAction(b.id, 'complete')} variant="green">Completar</Btn>
                            <Btn onClick={() => handleBookingAction(b.id, 'cancel')} variant="ghost">Cancelar</Btn>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: '#94a3b8' }}>{label}</p>
      <p className="font-semibold text-sm mt-0.5" style={{ color: '#0f172a' }}>{value}</p>
    </div>
  )
}

function Btn({ onClick, variant, children }: { onClick: () => void; variant: 'green' | 'blue' | 'ghost'; children: React.ReactNode }) {
  const s = { green: { background: '#dcfce7', color: '#166534' }, blue: { background: '#dbeafe', color: '#1e40af' }, ghost: { background: '#f1f5f9', color: '#475569' } }
  return (
    <button onClick={onClick} className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80" style={s[variant]}>
      {children}
    </button>
  )
}
