'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'

function normalizeTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${(h ?? '0').padStart(2, '0')}:${(m ?? '00').slice(0, 2).padStart(2, '0')}`
}

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

const STATUS_COLOR: Record<BookingStatus, { bg: string; text: string }> = {
  PENDING:   { bg: '#fef9c3', text: '#854d0e' },
  CONFIRMED: { bg: '#dbeafe', text: '#1e40af' },
  COMPLETED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#f1f5f9', text: '#64748b' },
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
  const toast = useToast()
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
  const [slotOk, setSlotOk]         = useState<boolean | null>(null)
  const [slotChecking, setSlotChecking] = useState(false)
  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => { phoneRef.current?.focus() }, [])

  const timeNorm = normalizeTime(time)

  useEffect(() => {
    if (!petId || !date || !timeNorm || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(timeNorm)) {
      setSlotOk(null)
      setSlotChecking(false)
      return
    }
    let cancelled = false
    setSlotChecking(true)
    const h = setTimeout(async () => {
      try {
        const { available } = await api.isSlotAvailable(date, timeNorm)
        if (!cancelled) setSlotOk(available)
      } catch {
        if (!cancelled) setSlotOk(null)
      } finally {
        if (!cancelled) setSlotChecking(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(h)
    }
  }, [petId, date, timeNorm])

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
    if (slotOk === false) return setSubmitErr('Ese horario ya está ocupado')
    setSubmitting(true)
    setSubmitErr('')
    try {
      await api.createBooking({ pet_id: petId, date, time: timeNorm, notes: notes || undefined })
      toast.success('Cita creada')
      onCreated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cita'
      setSubmitErr(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(17,28,68,0.4)' }} onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Nueva cita</h3>
          <button onClick={onClose} className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: '#94a3b8', background: '#f0f4ff' }}>×</button>
        </div>

        {/* Teléfono */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Teléfono del dueño</label>
          <div className="flex gap-2">
            <input
              ref={phoneRef}
              type="text"
              placeholder="+51987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchClient()}
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
            />
            <button
              onClick={searchClient}
              disabled={searching}
              className="px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              style={{ background: '#f0f4ff', color: '#334155' }}
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </div>
          {searchErr && <p className="text-red-500 text-xs mt-1.5">{searchErr}</p>}
          {client && <p className="text-xs mt-1.5 font-medium" style={{ color: '#166534' }}>✓ {client.name ?? client.phone}</p>}
        </div>

        {/* Mascotas */}
        {pets.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Mascota</label>
            <div className="flex flex-wrap gap-2">
              {pets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPetId(p.id)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={petId === p.id
                    ? { background: '#dbeafe', color: '#1e40af', border: '1.5px solid #93c5fd', fontWeight: 600 }
                    : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }
                  }
                >
                  {p.name} <span style={{ color: '#94a3b8' }}>({PET_TYPE_LABEL[p.type] ?? p.type})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Hora</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{
                border: slotOk === false ? '1.5px solid #fca5a5' : '1.5px solid #e4ebff',
                background: '#f8faff',
              }}
            />
          </div>
        </div>
        {petId && date && time && (
          <p className="text-xs mb-4 min-h-[1rem]" style={{ color: slotOk === false ? '#dc2626' : '#94a3b8' }}>
            {slotChecking && 'Comprobando disponibilidad…'}
            {!slotChecking && slotOk === true && 'Horario disponible'}
            {!slotChecking && slotOk === false && 'Ese horario ya está ocupado. Elegí otra hora.'}
          </p>
        )}

        {/* Notas */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Notas (opcional)</label>
          <input
            type="text"
            placeholder="Ej: traer carnet de vacunas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
          />
        </div>

        {submitErr && <p className="text-red-500 text-sm mb-3">{submitErr}</p>}

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={submitting || !petId || !date || !time || slotOk === false}
            className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            style={{ background: 'var(--blue)' }}
          >
            {submitting ? 'Creando...' : 'Crear cita'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-xl font-medium"
            style={{ background: '#f0f4ff', color: '#334155' }}
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
  const toast   = useToast()
  const confirm = useConfirm()
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
    if (action === 'cancel') {
      const ok = await confirm({
        title: 'Cancelar cita',
        message:
          '¿Seguro que querés cancelar esta cita? El horario quedará libre para otro paciente.',
        confirmLabel: 'Sí, cancelar',
        cancelLabel: 'No, volver',
        variant: 'danger',
      })
      if (!ok) return
    }
    try {
      if (action === 'confirm') {
        await api.confirmBooking(id)
        toast.success('Cita confirmada')
      }
      if (action === 'complete') {
        await api.completeBooking(id)
        toast.success('Cita completada')
      }
      if (action === 'cancel') {
        await api.cancelBooking(id)
        toast.info('Cita cancelada')
      }
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
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

      {/* Controles */}
      <div className="flex items-center gap-3 mb-5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={{ background: '#ffffff', border: '1.5px solid #e4ebff' }}
        />
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          style={{ background: 'var(--blue)' }}
        >
          <span>+</span> Nueva cita
        </button>
      </div>

      {loading && <p className="text-sm" style={{ color: '#94a3b8' }}>Cargando...</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>No hay turnos para este día.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-sm font-medium"
                style={{ color: 'var(--blue)' }}
              >
                + Agregar una cita
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8faff', borderBottom: '1px solid #e4ebff' }}>
                <tr>
                  {['Hora', 'Mascota', 'Tipo', 'Notas', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                      {h}
                    </th>
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
                    <td className="px-5 py-3.5 font-mono font-bold text-base" style={{ color: '#0f172a' }}>{b.time}</td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: '#0f172a' }}>{b.pet.name}</td>
                    <td className="px-5 py-3.5" style={{ color: '#475569' }}>{PET_TYPE_LABEL[b.pet.type] ?? b.pet.type}</td>
                    <td className="px-5 py-3.5" style={{ color: '#94a3b8' }}>{b.notes ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: STATUS_COLOR[b.status].bg, color: STATUS_COLOR[b.status].text }}
                      >
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'PENDING' && (
                          <ActionBtn onClick={() => handleAction(b.id, 'confirm')} variant="blue">Confirmar</ActionBtn>
                        )}
                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                          <>
                            <ActionBtn onClick={() => handleAction(b.id, 'complete')} variant="green">Completar</ActionBtn>
                            <ActionBtn onClick={() => handleAction(b.id, 'cancel')} variant="ghost">Cancelar</ActionBtn>
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

function ActionBtn({ onClick, variant, children }: {
  onClick: () => void
  variant: 'green' | 'blue' | 'ghost'
  children: React.ReactNode
}) {
  const styles = {
    green: { background: '#dcfce7', color: '#166534' },
    blue:  { background: '#dbeafe', color: '#1e40af' },
    ghost: { background: '#f1f5f9', color: '#475569' },
  }
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
      style={styles[variant]}
    >
      {children}
    </button>
  )
}
