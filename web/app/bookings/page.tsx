'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { createClient as supabaseClient } from '@/lib/supabase'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'

async function authFetch(path: string, options?: RequestInit) {
  const sb = supabaseClient()
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } })
}

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
type ModalStep = 'search' | 'found' | 'notfound' | 'form'

interface NewBookingModalProps {
  defaultDate: string
  onClose:  () => void
  onCreated: () => void
}

function NewBookingModal({ defaultDate, onClose, onCreated }: NewBookingModalProps) {
  const toast = useToast()

  // step
  const [step, setStep] = useState<ModalStep>('search')

  // search
  const [phone, setPhone]         = useState('')
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')

  // found
  const [client, setClient]           = useState<Client | null>(null)
  const [pets, setPets]               = useState<Pet[]>([])
  const [petId, setPetId]             = useState('')
  const [addNewPet, setAddNewPet]     = useState(false)
  const [newPetName, setNewPetName]   = useState('')
  const [newPetType, setNewPetType]   = useState('dog')

  // not-found inline create
  const [newOwnerName, setNewOwnerName]   = useState('')
  const [inlinePetName, setInlinePetName] = useState('')
  const [inlinePetType, setInlinePetType] = useState('dog')
  const [creating, setCreating]           = useState(false)
  const [createErr, setCreateErr]         = useState('')

  // form
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
      setSlotOk(null); setSlotChecking(false); return
    }
    let cancelled = false
    setSlotChecking(true)
    const h = setTimeout(async () => {
      try {
        const { available } = await api.isSlotAvailable(date, timeNorm) as { available: boolean }
        if (!cancelled) setSlotOk(available)
      } catch { if (!cancelled) setSlotOk(null) }
      finally  { if (!cancelled) setSlotChecking(false) }
    }, 400)
    return () => { cancelled = true; clearTimeout(h) }
  }, [petId, date, timeNorm])

  // ── Step 1: search ──────────────────────────────────────────────────────────
  const doSearch = async () => {
    const raw = phone.trim()
    if (raw.replace(/\D/g, '').length < 7) {
      setSearchErr('Ingresá al menos 7 dígitos'); return
    }
    setSearching(true); setSearchErr('')
    try {
      const res  = await authFetch(`/api/users/phone/${encodeURIComponent(raw)}`)
      const json = await res.json() as { ok: boolean; data: (Client & { pets?: Pet[] }) | null }
      if (json.data) {
        const c = json.data
        setClient(c)
        const clientPets: Pet[] = (c.pets ?? []) as Pet[]
        setPets(clientPets)
        if (clientPets.length === 1) setPetId(clientPets[0].id)
        setStep('found')
      } else {
        setStep('notfound')
      }
    } catch {
      setSearchErr('Error al buscar. Intentá de nuevo.')
    } finally { setSearching(false) }
  }

  // ── Step 3: create client + pet inline ─────────────────────────────────────
  const doCreateInline = async () => {
    if (newOwnerName.trim().length < 2) { setCreateErr('Nombre del dueño muy corto'); return }
    if (!inlinePetName.trim())          { setCreateErr('Ingresá el nombre de la mascota'); return }
    setCreating(true); setCreateErr('')
    try {
      const raw = phone.trim()
      const normalized = raw.startsWith('+') ? raw : `+51${raw}`

      const cRes  = await authFetch('/api/users', { method: 'POST', body: JSON.stringify({ phone: normalized, name: newOwnerName.trim() }) })
      const cJson = await cRes.json() as { data: Client }
      const newClient = cJson.data

      const pRes  = await authFetch('/api/pets', { method: 'POST', body: JSON.stringify({ user_id: newClient.id, name: inlinePetName.trim(), type: inlinePetType }) })
      const pJson = await pRes.json() as { data: Pet }
      const newPet = pJson.data

      setClient(newClient)
      setPets([newPet])
      setPetId(newPet.id)
      setStep('form')
    } catch {
      setCreateErr('Error al crear el cliente. Verificá los datos.')
    } finally { setCreating(false) }
  }

  // ── Step 2: add new pet on-the-fly ─────────────────────────────────────────
  const doAddNewPet = async () => {
    if (!client) return
    if (!newPetName.trim()) return
    try {
      const pRes  = await authFetch('/api/pets', { method: 'POST', body: JSON.stringify({ user_id: client.id, name: newPetName.trim(), type: newPetType }) })
      const pJson = await pRes.json() as { data: Pet }
      const p     = pJson.data
      setPets((prev) => [...prev, p])
      setPetId(p.id)
      setAddNewPet(false)
      setNewPetName('')
    } catch { /* ignore */ }
  }

  // ── Final submit ────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!petId)           return setSubmitErr('Seleccioná una mascota')
    if (!date)            return setSubmitErr('Ingresá la fecha')
    if (!time)            return setSubmitErr('Ingresá la hora')
    if (date < todayStr()) return setSubmitErr('La fecha no puede ser en el pasado')
    if (slotOk === false) return setSubmitErr('Ese horario ya está ocupado')
    setSubmitting(true); setSubmitErr('')
    try {
      await api.createBooking({ pet_id: petId, date, time: timeNorm, notes: notes || undefined })
      const petName  = pets.find((p) => p.id === petId)?.name ?? ''
      const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
      toast.success(`✓ Turno agendado para ${petName} el ${dateLabel} a las ${timeNorm}`)
      onCreated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cita'
      setSubmitErr(msg); toast.error(msg)
    } finally { setSubmitting(false) }
  }

  const selectedPet = pets.find((p) => p.id === petId)

  const INPUT = "w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
  const INPUT_STYLE = { border: '1.5px solid #e4ebff', background: '#f8faff' }
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>{children}</label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(17,28,68,0.4)' }} onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Nueva cita</h3>
          <button onClick={onClose} className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#94a3b8', background: '#f0f4ff' }}>×</button>
        </div>

        {/* ── STEP 1: Buscar ── */}
        {step === 'search' && (
          <div className="space-y-4">
            <div>
              <Label>Teléfono del dueño</Label>
              <div className="flex gap-2">
                <input
                  ref={phoneRef}
                  type="text"
                  placeholder="+51987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  className={INPUT}
                  style={INPUT_STYLE}
                />
                <button
                  onClick={doSearch}
                  disabled={searching}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#601EF9' }}
                >
                  {searching ? '…' : 'Buscar'}
                </button>
              </div>
              {searchErr && <p className="text-xs mt-1.5 text-red-500">{searchErr}</p>}
            </div>
            <button onClick={onClose} className="text-xs text-gray-400 hover:underline">Cancelar</button>
          </div>
        )}

        {/* ── STEP 2: Cliente encontrado ── */}
        {step === 'found' && client && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <span className="text-green-600">✓</span>
              <span className="text-sm font-semibold" style={{ color: '#166534' }}>{client.name ?? client.phone}</span>
              <span className="text-xs ml-auto" style={{ color: '#4ade80' }}>{client.phone}</span>
            </div>

            <div>
              <Label>Mascota</Label>
              <div className="flex flex-wrap gap-2">
                {pets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPetId(p.id); setAddNewPet(false) }}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={petId === p.id
                      ? { background: '#ede9fe', color: '#601EF9', border: '1.5px solid #a78bfa', fontWeight: 600 }
                      : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}
                  >
                    {p.name} <span style={{ color: '#94a3b8' }}>({PET_TYPE_LABEL[p.type] ?? p.type})</span>
                  </button>
                ))}
                <button
                  onClick={() => { setAddNewPet((v) => !v); setPetId('') }}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: '#f8faff', color: '#601EF9', border: '1.5px dashed #a78bfa' }}
                >
                  + Otra mascota
                </button>
              </div>
            </div>

            {addNewPet && (
              <div className="space-y-2 p-3 rounded-xl" style={{ background: '#fafafa', border: '1px solid #e4ebff' }}>
                <input
                  type="text"
                  placeholder="Nombre de la mascota"
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  className={INPUT}
                  style={INPUT_STYLE}
                />
                <select value={newPetType} onChange={(e) => setNewPetType(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                  <option value="dog">Perro</option>
                  <option value="cat">Gato</option>
                  <option value="bird">Ave</option>
                  <option value="rabbit">Conejo</option>
                  <option value="other">Otro</option>
                </select>
                <button onClick={doAddNewPet} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#601EF9' }}>
                  Agregar y seleccionar
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setStep('search'); setClient(null); setPets([]); setPetId('') }}
                className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>
                ← Volver
              </button>
              <button
                onClick={() => { if (petId) setStep('form') }}
                disabled={!petId}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
                style={{ background: '#601EF9' }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: No encontrado — crear inline ── */}
        {step === 'notfound' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <span>⚠️</span>
              <span className="text-sm font-medium" style={{ color: '#92400e' }}>No encontramos el número <strong>{phone}</strong></span>
            </div>

            <div>
              <Label>Nombre del dueño</Label>
              <input type="text" placeholder="María García" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <Label>Nombre mascota</Label>
              <input type="text" placeholder="Draco" value={inlinePetName} onChange={(e) => setInlinePetName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <Label>Tipo</Label>
              <select value={inlinePetType} onChange={(e) => setInlinePetType(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                <option value="dog">Perro</option>
                <option value="cat">Gato</option>
                <option value="bird">Ave</option>
                <option value="rabbit">Conejo</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {createErr && <p className="text-xs text-red-500">{createErr}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep('search')} className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>
                ← Volver
              </button>
              <button
                onClick={doCreateInline}
                disabled={creating}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                style={{ background: '#601EF9' }}
              >
                {creating ? 'Creando…' : 'Crear y continuar →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Formulario fecha/hora ── */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* resumen cliente + mascota */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
              <span className="text-sm font-semibold" style={{ color: '#601EF9' }}>
                {client?.name ?? client?.phone} · {selectedPet?.name ?? ''} {selectedPet ? (PET_TYPE_LABEL[selectedPet.type] ?? '') : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <input
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  className={INPUT}
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <Label>Hora</Label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={INPUT}
                  style={{ ...INPUT_STYLE, border: slotOk === false ? '1.5px solid #fca5a5' : INPUT_STYLE.border }}
                />
              </div>
            </div>

            {petId && date && time && (
              <p className="text-xs min-h-[1rem]" style={{ color: slotOk === false ? '#dc2626' : '#94a3b8' }}>
                {slotChecking              && 'Comprobando disponibilidad…'}
                {!slotChecking && slotOk === true  && '✓ Horario disponible'}
                {!slotChecking && slotOk === false && 'Ese horario ya está ocupado. Elegí otra hora.'}
              </p>
            )}

            <div>
              <Label>Notas (opcional)</Label>
              <input type="text" placeholder="Ej: traer carnet de vacunas" value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} style={INPUT_STYLE} />
            </div>

            {submitErr && <p className="text-red-500 text-xs">{submitErr}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('found')} className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>
                ← Volver
              </button>
              <button
                onClick={submit}
                disabled={submitting || !petId || !date || !time || slotOk === false}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
                style={{ background: '#601EF9' }}
              >
                {submitting ? 'Agendando…' : 'Confirmar turno →'}
              </button>
            </div>
          </div>
        )}

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
