'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

interface Booking {
  id: string
  date: string
  time: string
  status: BookingStatus
  notes?: string
  pet: { id: string; name: string; type: string }
}

interface Client {
  id: string
  phone: string
  name?: string
}

interface Pet {
  id: string
  name: string
  type: string
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

const STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const PET_TYPE_LABEL: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Modal nueva cita ─────────────────────────────────────────────────────────
interface NewBookingModalProps {
  defaultDate: string
  onClose: () => void
  onCreated: () => void
}

function NewBookingModal({ defaultDate, onClose, onCreated }: NewBookingModalProps) {
  const [phone, setPhone]           = useState('')
  const [client, setClient]         = useState<Client | null>(null)
  const [pets, setPets]             = useState<Pet[]>([])
  const [searchErr, setSearchErr]   = useState('')
  const [searching, setSearching]   = useState(false)

  const [petId, setPetId]           = useState('')
  const [date, setDate]             = useState(defaultDate)
  const [time, setTime]             = useState('')
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr]   = useState('')

  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => { phoneRef.current?.focus() }, [])

  const searchClient = async () => {
    if (!phone.trim()) return
    setSearching(true)
    setSearchErr('')
    setClient(null)
    setPets([])
    setPetId('')
    try {
      const c = await api.getClientByPhone(phone.trim()) as Client
      setClient(c)
      const p = await api.getPetsByUser(c.id) as Pet[]
      setPets(p)
      if (p.length === 1) setPetId(p[0].id)
    } catch (e: unknown) {
      setSearchErr(e instanceof Error ? e.message : 'Cliente no encontrado')
    } finally {
      setSearching(false)
    }
  }

  const submit = async () => {
    if (!petId) return setSubmitErr('Seleccioná una mascota')
    if (!date)  return setSubmitErr('Ingresá la fecha')
    if (!time)  return setSubmitErr('Ingresá la hora')
    setSubmitting(true)
    setSubmitErr('')
    try {
      await api.createBooking({ pet_id: petId, date, time, notes: notes || undefined })
      onCreated()
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : 'Error al crear cita')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">Nueva cita</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Paso 1: buscar cliente por teléfono */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Teléfono del dueño
          </label>
          <div className="flex gap-2">
            <input
              ref={phoneRef}
              type="text"
              placeholder="+51987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchClient()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={searchClient}
              disabled={searching}
              className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </div>
          {searchErr && <p className="text-red-500 text-xs mt-1.5">{searchErr}</p>}
          {client && (
            <p className="text-green-700 text-xs mt-1.5 font-medium">
              ✓ {client.name ?? client.phone}
            </p>
          )}
        </div>

        {/* Paso 2: seleccionar mascota */}
        {pets.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Mascota
            </label>
            <div className="flex flex-wrap gap-2">
              {pets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPetId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    petId === p.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {p.name}
                  <span className="ml-1 text-xs text-gray-400">({PET_TYPE_LABEL[p.type] ?? p.type})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Hora
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* Notas */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Notas (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: traer carnet de vacunas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {submitErr && <p className="text-red-500 text-sm mb-3">{submitErr}</p>}

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={submitting || !petId || !date || !time}
            className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear cita'}
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [date, setDate]         = useState(todayStr())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getBookings(date) as Booking[]
      setBookings(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar agenda')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    try {
      if (action === 'confirm')  await api.confirmBooking(id)
      if (action === 'complete') await api.completeBooking(id)
      if (action === 'cancel')   await api.cancelBooking(id)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div>
      {showModal && (
        <NewBookingModal
          defaultDate={date}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Agenda</h2>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            + Nueva cita
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}
      {error   && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm mb-3">No hay turnos para este día.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-indigo-600 text-sm hover:underline"
              >
                + Agregar una cita
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Hora</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Mascota</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Notas</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono font-medium">{b.time}</td>
                    <td className="px-5 py-3 font-medium">{b.pet.name}</td>
                    <td className="px-5 py-3 text-gray-500 capitalize">{PET_TYPE_LABEL[b.pet.type] ?? b.pet.type}</td>
                    <td className="px-5 py-3 text-gray-500">{b.notes ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'PENDING' && (
                          <button
                            onClick={() => handleAction(b.id, 'confirm')}
                            className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Confirmar
                          </button>
                        )}
                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                          <>
                            <button
                              onClick={() => handleAction(b.id, 'complete')}
                              className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                              Completar
                            </button>
                            <button
                              onClick={() => handleAction(b.id, 'cancel')}
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
      )}
    </div>
  )
}
