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
  const [newOwnerName, setNewOwnerName]     = useState('')
  const [inlinePetName, setInlinePetName]   = useState('')
  const [inlinePetType, setInlinePetType]   = useState('dog')
  const [inlinePetBreed, setInlinePetBreed] = useState('')
  const [inlineBirthDate, setInlineBirthDate] = useState('')
  const [creating, setCreating]             = useState(false)
  const [createErr, setCreateErr]           = useState('')

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
    const raw = phone.trim()
    if (!raw || raw.replace(/\D/g, '').length < 7) { setCreateErr('Ingresá un teléfono válido'); return }
    setCreating(true); setCreateErr('')
    try {
      const normalized = raw.startsWith('+') ? raw : `+51${raw}`

      const cRes  = await authFetch('/api/users', { method: 'POST', body: JSON.stringify({ phone: normalized, name: newOwnerName.trim() }) })
      const cJson = await cRes.json() as { data: Client }
      const newClient = cJson.data

      const pRes  = await authFetch('/api/pets', { method: 'POST', body: JSON.stringify({ user_id: newClient.id, name: inlinePetName.trim(), type: inlinePetType, breed: inlinePetBreed.trim() || undefined, birth_date: inlineBirthDate || undefined }) })
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
      <div className="relative rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col" style={{ background: '#ffffff', border: '1px solid #e4ebff', maxHeight: '90vh' }}>

        {/* Header — fijo */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: '1px solid #f0f4ff' }}>
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Nueva cita</h3>
          <button onClick={onClose} className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#94a3b8', background: '#f0f4ff' }}>×</button>
        </div>

        {/* Contenido — scrollable */}
        <div className="overflow-y-auto px-6 py-5 flex-1">

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
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              <span className="text-gray-200 text-xs">|</span>
              <button
                onClick={() => { setPhone(''); setStep('notfound') }}
                className="text-xs font-semibold hover:underline"
                style={{ color: '#601EF9' }}
              >
                + Nuevo cliente
              </button>
            </div>
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
            {phone ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <span>⚠️</span>
                <span className="text-sm font-medium" style={{ color: '#92400e' }}>No encontramos el número <strong>{phone}</strong></span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#601EF9' }}>NUEVO CLIENTE</p>
                <input
                  type="text"
                  placeholder="Teléfono (+51987654321)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={INPUT}
                  style={INPUT_STYLE}
                />
              </div>
            )}

            <div>
              <Label>Nombre del dueño</Label>
              <input type="text" placeholder="María García" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
            </div>
            {/* Mascota */}
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7c3aed' }}>
                {['🐶','🐱','🐦','🐰','🐾'][['dog','cat','bird','rabbit','other'].indexOf(inlinePetType)] ?? '🐾'} Mascota
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label>Nombre de la mascota</Label>
                  <input type="text" placeholder="Draco, Luna…" value={inlinePetName} onChange={(e) => setInlinePetName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <Label>Especie</Label>
                  <select value={inlinePetType} onChange={(e) => setInlinePetType(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                    <option value="dog">🐶 Perro</option>
                    <option value="cat">🐱 Gato</option>
                    <option value="bird">🐦 Ave</option>
                    <option value="rabbit">🐰 Conejo</option>
                    <option value="other">🐾 Otro</option>
                  </select>
                </div>
                <div>
                  <Label>Raza (opcional)</Label>
                  <input type="text" placeholder="Labrador…" value={inlinePetBreed} onChange={(e) => setInlinePetBreed(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div className="col-span-2">
                  <Label>Fecha de nacimiento (opcional)</Label>
                  <input type="date" value={inlineBirthDate} onChange={(e) => setInlineBirthDate(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>

            {createErr && <p className="text-xs text-red-500">{createErr}</p>}

            <div className="flex gap-2">
              <button onClick={() => { setStep('search'); setNewOwnerName(''); setInlinePetName(''); setInlinePetBreed(''); setInlineBirthDate(''); setCreateErr('') }} className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>
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

        </div>{/* fin scrollable */}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
type QuickFilter = 'today' | 'tomorrow' | 'pending' | 'all'

const FILTER_STATUSES: Record<QuickFilter, BookingStatus[]> = {
  today:    ['PENDING', 'CONFIRMED'],
  tomorrow: ['PENDING', 'CONFIRMED'],
  pending:  ['PENDING'],
  all:      ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
}

export default function BookingsPage() {
  const toast   = useToast()
  const confirm = useConfirm()

  const [filter, setFilter]       = useState<QuickFilter>('today')
  const [date, setDate]           = useState(todayStr())
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showModal, setShowModal] = useState(false)
  const [actionId, setActionId]   = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('new=1')) {
      setShowModal(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Sync date with filter
  useEffect(() => {
    if (filter === 'today')    setDate(todayStr())
    if (filter === 'tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1)
      setDate(d.toISOString().slice(0, 10))
    }
  }, [filter])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await api.getBookings(filter === 'pending' ? todayStr() : date) as Booking[]
      setBookings(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar servicios')
    } finally { setLoading(false) }
  }, [date, filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    if (action === 'cancel') {
      const ok = await confirm({
        title: 'Cancelar servicio',
        message: '¿Cancelar este servicio? El horario quedará libre.',
        confirmLabel: 'Sí, cancelar', cancelLabel: 'No, volver', variant: 'danger',
      })
      if (!ok) return
    }
    setActionId(id)
    try {
      if (action === 'confirm')  { await api.confirmBooking(id);  toast.success('Servicio confirmado') }
      if (action === 'complete') { await api.completeBooking(id); toast.success('Servicio completado ✓') }
      if (action === 'cancel')   { await api.cancelBooking(id);   toast.info('Servicio cancelado') }
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    } finally { setActionId(null) }
  }

  // Client-side filter by status
  const allowedStatuses = FILTER_STATUSES[filter]
  const visible = bookings.filter(b => allowedStatuses.includes(b.status))

  // Summary counts
  const counts = {
    pending:   bookings.filter(b => b.status === 'PENDING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
  }

  const filterLabels: Record<QuickFilter, string> = {
    today: 'Hoy', tomorrow: 'Mañana', pending: 'Pendientes', all: 'Todos',
  }

  return (
    <div className="space-y-4">
      {showModal && (
        <NewBookingModal
          defaultDate={date}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex p-1 rounded-xl gap-1" style={{ background: '#F3EEFF' }}>
            {(Object.keys(filterLabels) as QuickFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={filter === f
                  ? { background: '#601EF9', color: '#fff' }
                  : { color: '#601EF9' }}
              >
                {filterLabels[f]}
                {f === 'pending' && counts.pending > 0 && (
                  <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: filter === 'pending' ? 'rgba(255,255,255,0.25)' : '#601EF9', color: '#fff' }}>
                    {counts.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Date picker para filtro custom */}
          {(filter === 'all') && (
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl outline-none"
              style={{ background: '#fff', border: '1.5px solid #ede9fe', color: '#0f172a' }}
            />
          )}
        </div>

        {/* Resumen + acción */}
        <div className="flex items-center gap-3">
          {/* Mini stats */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: '#fff', border: '1px solid #ede9fe' }}>
            <span style={{ color: '#94a3b8' }}>
              <span className="font-bold" style={{ color: '#f59e0b' }}>{counts.pending}</span> pendientes
            </span>
            <span className="w-px h-3" style={{ background: '#ede9fe' }} />
            <span style={{ color: '#94a3b8' }}>
              <span className="font-bold" style={{ color: '#1d4ed8' }}>{counts.confirmed}</span> confirmados
            </span>
            <span className="w-px h-3" style={{ background: '#ede9fe' }} />
            <span style={{ color: '#94a3b8' }}>
              <span className="font-bold" style={{ color: '#16a34a' }}>{counts.completed}</span> completados
            </span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            <span className="text-base leading-none">+</span> Nuevo servicio
          </button>
        </div>
      </div>

      {/* ── Lista principal ── */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
          ))}
        </div>
      )}
      {error && (
        <div className="py-4 px-5 rounded-2xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState onNew={() => setShowModal(true)} filter={filter} />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          {/* Table header */}
          <div className="grid text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5"
            style={{ gridTemplateColumns: '70px 1fr 90px 90px 110px 200px', background: '#F9F9FB', borderBottom: '1px solid #ede9fe', color: '#94a3b8' }}>
            <span>Hora</span>
            <span>Servicio</span>
            <span>Tipo</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
            {visible.map(b => (
              <ServiceRow
                key={b.id}
                booking={b}
                isActioning={actionId === b.id}
                onConfirm={() => handleAction(b.id, 'confirm')}
                onComplete={() => handleAction(b.id, 'complete')}
                onCancel={() => handleAction(b.id, 'cancel')}
                onAssignRoute={() => toast.success('Asignación a ruta — próximamente 🛵')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fila de servicio ─────────────────────────────────────────────────────────
const STATUS_ROW_BG: Record<BookingStatus, string> = {
  PENDING:   'transparent',
  CONFIRMED: 'transparent',
  COMPLETED: '#f8fffe',
  CANCELLED: '#fafafa',
}

function ServiceRow({ booking: b, isActioning, onConfirm, onComplete, onCancel, onAssignRoute }: {
  booking: Booking
  isActioning: boolean
  onConfirm: () => void
  onComplete: () => void
  onCancel: () => void
  onAssignRoute: () => void
}) {
  const [open, setOpen] = useState(false)
  const isPending   = b.status === 'PENDING'
  const isActive    = b.status === 'PENDING' || b.status === 'CONFIRMED'
  const isCompleted = b.status === 'COMPLETED'

  const dateLabel = new Date(b.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short',
  })

  return (
    <div
      className="relative"
      style={{ background: STATUS_ROW_BG[b.status] }}
    >
      {/* Indicador lateral de estado */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full"
        style={{ background: isPending ? '#f59e0b' : b.status === 'CONFIRMED' ? '#601EF9' : isCompleted ? '#10b981' : '#e2e8f0' }} />

      <div
        className="grid items-center px-4 py-3.5 transition-colors"
        style={{ gridTemplateColumns: '70px 1fr 90px 90px 110px 200px' }}
        onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.background = '#FAFAFF' }}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Hora */}
        <span className="font-mono text-sm font-bold" style={{ color: isCompleted ? '#94a3b8' : '#0f172a' }}>
          {b.time}
        </span>

        {/* Servicio (mascota) */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{PET_EMOJI[b.pet.type] ?? '🐾'}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate"
                style={{ color: isCompleted ? '#94a3b8' : '#0f172a', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                {b.pet.name}
              </p>
              {b.notes && (
                <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{b.notes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tipo */}
        <span className="text-xs font-medium" style={{ color: '#475569' }}>
          {PET_TYPE_LABEL[b.pet.type] ?? b.pet.type}
        </span>

        {/* Fecha */}
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>{dateLabel}</span>

        {/* Badge estado */}
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit flex items-center gap-1"
          style={{ background: STATUS_COLOR[b.status].bg, color: STATUS_COLOR[b.status].text }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_COLOR[b.status].text }} />
          {STATUS_LABEL[b.status]}
        </span>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-1.5">
          {isActioning ? (
            <span className="text-xs" style={{ color: '#94a3b8' }}>Procesando…</span>
          ) : (
            <>
              {/* Asignar a ruta — siempre visible si activo */}
              {isActive && (
                <button onClick={onAssignRoute}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}>
                  🛵 Ruta
                </button>
              )}
              {isPending && (
                <button onClick={onConfirm}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ background: '#dbeafe', color: '#1e40af' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#bfdbfe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#dbeafe'}>
                  Confirmar
                </button>
              )}
              {isActive && (
                <button onClick={onComplete}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ background: '#dcfce7', color: '#166534' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}>
                  ✓ Listo
                </button>
              )}
              {isActive && (
                <div className="relative">
                  <button onClick={() => setOpen(o => !o)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: '#f1f5f9', color: '#64748b' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                    ⋯
                  </button>
                  {open && (
                    <div className="absolute right-0 top-8 z-20 rounded-xl shadow-lg py-1 min-w-[140px]"
                      style={{ background: '#fff', border: '1px solid #ede9fe' }}>
                      <DropItem label="📅 Reprogramar" onClick={() => { setOpen(false); }} />
                      <DropItem label="🗑️ Cancelar" onClick={() => { setOpen(false); onCancel() }} danger />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DropItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2 text-xs font-medium transition-colors"
      style={{ color: danger ? '#dc2626' : '#334155' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#fef2f2' : '#F3EEFF'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {label}
    </button>
  )
}

function EmptyState({ onNew, filter }: { onNew: () => void; filter: QuickFilter }) {
  const messages: Record<QuickFilter, { icon: string; title: string; sub: string }> = {
    today:    { icon: '📅', title: 'Sin servicios para hoy',      sub: 'Agendá el primer servicio del día.' },
    tomorrow: { icon: '📅', title: 'Sin servicios para mañana',   sub: 'Planificá la jornada de mañana.' },
    pending:  { icon: '✅', title: 'Todo confirmado',             sub: 'No hay servicios pendientes de confirmar.' },
    all:      { icon: '📋', title: 'Sin servicios en esta fecha', sub: 'Creá un nuevo servicio para este día.' },
  }
  const m = messages[filter]
  return (
    <div className="flex flex-col items-center py-16 gap-4 rounded-2xl"
      style={{ background: '#fff', border: '1.5px dashed #ddd6fe' }}>
      <span className="text-5xl">{m.icon}</span>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{m.title}</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{m.sub}</p>
      </div>
      <button onClick={onNew}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
        + Nuevo servicio
      </button>
    </div>
  )
}

const PET_EMOJI: Record<string, string> = { dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾' }
