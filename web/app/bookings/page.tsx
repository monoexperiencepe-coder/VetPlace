'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
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
  requires_pickup?: boolean
  delivery_time?: string
  pet: { id: string; name: string; type: string; user?: { id: string; name?: string; phone: string } }
}

// ClinicSchedule kept for backward compat — no longer used for slot generation
interface ClinicSchedule { morning: boolean; afternoon: boolean; morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string }

interface LogisticaSettings {
  pickupEnabled: boolean
  pickupMorning: boolean; pickupAfternoon: boolean
  pickupMorningStart: string; pickupMorningEnd: string
  pickupAfternoonStart: string; pickupAfternoonEnd: string
  deliveryEnabled: boolean
  deliveryMorning: boolean; deliveryAfternoon: boolean
  deliveryMorningStart: string; deliveryMorningEnd: string
  deliveryAfternoonStart: string; deliveryAfternoonEnd: string
}

interface TimeWindow { label: string; value: string }

// Genera TURNOS completos (ventanas), no slots de 30 min.
// El cliente elige "Mañana (09:00-11:00)" y todos se agrupan en una sola ruta.
function generateTimeWindows(s: LogisticaSettings, type: 'pickup' | 'delivery'): TimeWindow[] {
  const windows: TimeWindow[] = []
  const p = type === 'pickup'
  const morningOn  = p ? s.pickupMorning   : s.deliveryMorning
  const afternoonOn= p ? s.pickupAfternoon : s.deliveryAfternoon
  const ms = p ? s.pickupMorningStart   : s.deliveryMorningStart
  const me = p ? s.pickupMorningEnd     : s.deliveryMorningEnd
  const as_ = p ? s.pickupAfternoonStart : s.deliveryAfternoonStart
  const ae  = p ? s.pickupAfternoonEnd   : s.deliveryAfternoonEnd
  if (morningOn)   windows.push({ label: `🌅 Mañana (${ms} – ${me})`,  value: ms })
  if (afternoonOn) windows.push({ label: `🌆 Tarde (${as_} – ${ae})`, value: as_ })
  return windows
}

interface Client {
  id: string
  phone: string
  name?: string
  address?: string
  distrito?: string
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

const PET_EMOJI: Record<string, string> = {
  dog: '\U0001f415', cat: '\U0001f431', bird: '\U0001f99c', rabbit: '\U0001f407', other: '\U0001f43e',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Modal nueva cita
type ModalStep = 'search' | 'found' | 'notfound' | 'form'

interface NewBookingModalProps {
  defaultDate: string
  onClose:  () => void
  onCreated: () => void
}

function NewBookingModal({ defaultDate, onClose, onCreated }: NewBookingModalProps) {
  const toast = useToast()
  const [step, setStep] = useState<ModalStep>('search')
  const [phone, setPhone]         = useState('')
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [clientQuery, setClientQuery]       = useState('')
  const [clientResults, setClientResults]   = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [client, setClient]           = useState<Client | null>(null)
  const [pets, setPets]               = useState<Pet[]>([])
  const [petId, setPetId]             = useState('')
  const [addNewPet, setAddNewPet]     = useState(false)
  const [newPetName, setNewPetName]   = useState('')
  const [newPetType, setNewPetType]   = useState('dog')
  const [newOwnerName, setNewOwnerName]     = useState('')
  const [inlinePetName, setInlinePetName]   = useState('')
  const [inlinePetType, setInlinePetType]   = useState('dog')
  const [inlinePetBreed, setInlinePetBreed] = useState('')
  const [inlineBirthDate, setInlineBirthDate] = useState('')
  const [creating, setCreating]             = useState(false)
  const [createErr, setCreateErr]           = useState('')
  const [date, setDate]             = useState(defaultDate)
  const [time, setTime]             = useState('')
  const [notes, setNotes]           = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [serviceTypes, setServiceTypes]   = useState<{ id: string; name: string; price: number | null; active: boolean }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr]   = useState('')
  const [slotOk, setSlotOk]         = useState<boolean | null>(null)
  const [slotChecking, setSlotChecking] = useState(false)
  const [requiresPickup,   setRequiresPickup]   = useState(false)
  const [requiresDelivery, setRequiresDelivery] = useState(false)
  const [deliveryTime,     setDeliveryTime]     = useState('')
  const [pickupAddress,    setPickupAddress]    = useState('')
  const [logistica, setLogistica] = useState<LogisticaSettings | null>(null)
  const [logisticaLoaded, setLogisticaLoaded] = useState(false)

  // Computed windows — derived directly from logistica to avoid stale refs
  const pickupWindows:   TimeWindow[] = logistica ? generateTimeWindows(logistica, 'pickup')   : []
  const deliveryWindows: TimeWindow[] = logistica ? generateTimeWindows(logistica, 'delivery') : []

  const phoneRef = useRef<HTMLInputElement>(null)
  useEffect(() => { phoneRef.current?.focus() }, [])

  useEffect(() => {
    api.getServiceTypes()
      .then(d => setServiceTypes((d as typeof serviceTypes).filter(s => s.active)))
      .catch(() => {})
    api.getMyClinic()
      .then(c => {
        const clinic = c as { settings?: { logistica?: Record<string, unknown> } }
        const l = clinic?.settings?.logistica
        if (!l) return
        const str  = (k: string, def: string)    => typeof l[k] === 'string'  ? l[k] as string  : def
        // 'pickup' is the old key name — migrate transparently
        const bool = (k: string, def: boolean, legacy?: string) => {
          if (typeof l[k] === 'boolean') return l[k] as boolean
          if (legacy && typeof l[legacy] === 'boolean') return l[legacy] as boolean
          return def
        }
        setLogistica({
          pickupEnabled:        bool('pickupEnabled', false, 'pickup'),
          pickupMorning:        bool('pickupMorning', true),
          pickupAfternoon:      bool('pickupAfternoon', false),
          pickupMorningStart:   str('pickupMorningStart', '09:00'),
          pickupMorningEnd:     str('pickupMorningEnd', '12:00'),
          pickupAfternoonStart: str('pickupAfternoonStart', '14:00'),
          pickupAfternoonEnd:   str('pickupAfternoonEnd', '18:00'),
          deliveryEnabled:        bool('deliveryEnabled', false),
          deliveryMorning:        bool('deliveryMorning', false),
          deliveryAfternoon:      bool('deliveryAfternoon', true),
          deliveryMorningStart:   str('deliveryMorningStart', '11:00'),
          deliveryMorningEnd:     str('deliveryMorningEnd', '13:00'),
          deliveryAfternoonStart: str('deliveryAfternoonStart', '15:00'),
          deliveryAfternoonEnd:   str('deliveryAfternoonEnd', '19:00'),
        })
        setLogisticaLoaded(true)
      })
      .catch(() => { setLogisticaLoaded(true) })
  }, [])

  useEffect(() => {
    if (step !== 'search') return
    const q = clientQuery.trim()
    if (q.length === 0) {
      setLoadingClients(true)
      api.getRecentClients()
        .then(d => setClientResults((d as Client[]).slice(0, 8)))
        .catch(() => {})
        .finally(() => setLoadingClients(false))
      return
    }
    if (q.length < 2) return
    let cancelled = false
    const t = setTimeout(async () => {
      setLoadingClients(true)
      try {
        const res = await api.searchClients(q) as Client[]
        if (!cancelled) setClientResults(res.slice(0, 8))
      } catch { /* silent */ }
      finally { if (!cancelled) setLoadingClients(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [clientQuery, step])

  const selectClient = async (c: Client) => {
    setClient(c)
    setShowDropdown(false)
    try {
      const clientPets = await api.getPetsByUser(c.id) as Pet[]
      setPets(clientPets)
      if (clientPets.length === 1) setPetId(clientPets[0].id)
    } catch { setPets([]) }
    setStep('found')
  }

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

  const doSearch = async () => {
    const raw = phone.trim()
    if (raw.replace(/\D/g, '').length < 7) {
      setSearchErr('Ingresa al menos 7 digitos'); return
    }
    setSearching(true); setSearchErr('')
    try {
      const c = await api.getClientByPhone(raw) as (Client & { pets?: Pet[] }) | null
      if (c) {
        setClient(c)
        const clientPets: Pet[] = (c.pets ?? []) as Pet[]
        setPets(clientPets)
        if (clientPets.length === 1) setPetId(clientPets[0].id)
        setStep('found')
      } else {
        setStep('notfound')
      }
    } catch {
      setStep('notfound')
    } finally { setSearching(false) }
  }

  const doCreateInline = async () => {
    if (newOwnerName.trim().length < 2) { setCreateErr('Nombre del dueno muy corto'); return }
    if (!inlinePetName.trim())          { setCreateErr('Ingresa el nombre de la mascota'); return }
    const raw = phone.trim()
    if (!raw || raw.replace(/\D/g, '').length < 7) { setCreateErr('Ingresa un telefono valido'); return }
    setCreating(true); setCreateErr('')
    try {
      const normalized = raw.startsWith('+') ? raw : `+51${raw}`
      const newClient = await api.createClient({ phone: normalized, name: newOwnerName.trim() }) as Client
      const newPet    = await api.createPet({ user_id: newClient.id, name: inlinePetName.trim(), type: inlinePetType, breed: inlinePetBreed.trim() || undefined, birth_date: inlineBirthDate || undefined }) as Pet
      setClient(newClient)
      setPets([newPet])
      setPetId(newPet.id)
      setStep('form')
    } catch {
      setCreateErr('Error al crear el cliente. Verifica los datos.')
    } finally { setCreating(false) }
  }

  const doAddNewPet = async () => {
    if (!client) return
    if (!newPetName.trim()) return
    try {
      const p = await api.createPet({ user_id: client.id, name: newPetName.trim(), type: newPetType }) as Pet
      setPets((prev) => [...prev, p])
      setPetId(p.id)
      setAddNewPet(false)
      setNewPetName('')
    } catch { /* ignore */ }
  }

  const submit = async () => {
    if (!petId)           return setSubmitErr('Selecciona una mascota')
    if (!date)            return setSubmitErr('Ingresa la fecha')
    if (!time)            return setSubmitErr('Ingresa la hora')
    if (date < todayStr()) return setSubmitErr('La fecha no puede ser en el pasado')
    if (slotOk === false) return setSubmitErr('Ese horario ya esta ocupado')
    setSubmitting(true); setSubmitErr('')
    try {
      await api.createBooking({ pet_id: petId, date, time: timeNorm, notes: notes || undefined, service_type_id: serviceTypeId || undefined, requires_pickup: requiresPickup, pickup_address: requiresPickup ? (pickupAddress || undefined) : undefined, delivery_time: requiresDelivery ? deliveryTime || undefined : undefined })
      const petName  = pets.find((p) => p.id === petId)?.name ?? ''
      const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
      toast.success(`Turno agendado para ${petName} el ${dateLabel} a las ${timeNorm}`)
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
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: '1px solid #f0f4ff' }}>
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Nueva cita</h3>
          <button onClick={onClose} className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#94a3b8', background: '#f0f4ff' }}>x</button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">
        {step === 'search' && (
          <div className="space-y-4">
            <div>
              <Label>Buscar cliente</Label>
              <div className="relative">
                <input type="text" placeholder="Nombre o telefono..." value={clientQuery}
                  onChange={e => { setClientQuery(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)} className={INPUT}
                  style={{ ...INPUT_STYLE, paddingRight: 36 }} autoFocus />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">search</span>
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden"
                    style={{ background: '#fff', border: '1.5px solid #e4ebff', boxShadow: '0 8px 24px rgba(96,30,249,0.12)' }}>
                    {loadingClients ? (
                      <div className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>Cargando...</div>
                    ) : clientResults.length === 0 ? (
                      <div className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>Sin resultados</div>
                    ) : (
                      clientResults.map(c => (
                        <button key={c.id} onMouseDown={() => selectClient(c)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50 transition-colors">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                            {(c.name ?? c.phone).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{c.name ?? c.phone}</p>
                            <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{c.phone}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#e4ebff' }} />
              <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>o por telefono</span>
              <div className="flex-1 h-px" style={{ background: '#e4ebff' }} />
            </div>
            <div>
              <Label>Telefono del dueno</Label>
              <div className="flex gap-2">
                <input ref={phoneRef} type="text" placeholder="+51987654321" value={phone}
                  onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  className={INPUT} style={INPUT_STYLE} />
                <button onClick={doSearch} disabled={searching}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#601EF9' }}>{searching ? '...' : 'Buscar'}</button>
              </div>
              {searchErr && <p className="text-xs mt-1.5 text-red-500">{searchErr}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              <span className="text-gray-200 text-xs">|</span>
              <button onClick={() => { setPhone(''); setStep('notfound') }}
                className="text-xs font-semibold hover:underline" style={{ color: '#601EF9' }}>+ Nuevo cliente</button>
            </div>
          </div>
        )}
        {step === 'found' && client && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <span className="text-green-600">ok</span>
              <span className="text-sm font-semibold" style={{ color: '#166534' }}>{client.name ?? client.phone}</span>
              <span className="text-xs ml-auto" style={{ color: '#4ade80' }}>{client.phone}</span>
            </div>
            <div>
              <Label>Mascota</Label>
              <div className="flex flex-wrap gap-2">
                {pets.map((p) => (
                  <button key={p.id} onClick={() => { setPetId(p.id); setAddNewPet(false) }}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={petId === p.id
                      ? { background: '#ede9fe', color: '#601EF9', border: '1.5px solid #a78bfa', fontWeight: 600 }
                      : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                    {p.name} <span style={{ color: '#94a3b8' }}>({PET_TYPE_LABEL[p.type] ?? p.type})</span>
                  </button>
                ))}
                <button onClick={() => { setAddNewPet((v) => !v); setPetId('') }}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: '#f8faff', color: '#601EF9', border: '1.5px dashed #a78bfa' }}>
                  + Otra mascota
                </button>
              </div>
            </div>
            {addNewPet && (
              <div className="space-y-2 p-3 rounded-xl" style={{ background: '#fafafa', border: '1px solid #e4ebff' }}>
                <input type="text" placeholder="Nombre de la mascota" value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                <select value={newPetType} onChange={(e) => setNewPetType(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                  <option value="dog">Perro</option><option value="cat">Gato</option>
                  <option value="bird">Ave</option><option value="rabbit">Conejo</option><option value="other">Otro</option>
                </select>
                <button onClick={doAddNewPet} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#601EF9' }}>
                  Agregar y seleccionar
                </button>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setStep('search'); setClient(null); setPets([]); setPetId('') }}
                className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>
                Volver
              </button>
              <button onClick={() => { if (petId) setStep('form') }} disabled={!petId}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
                style={{ background: '#601EF9' }}>Continuar</button>
            </div>
          </div>
        )}
        {step === 'notfound' && (
          <div className="space-y-4">
            {phone ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <span>!</span>
                <span className="text-sm font-medium" style={{ color: '#92400e' }}>No encontramos el numero <strong>{phone}</strong></span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#601EF9' }}>NUEVO CLIENTE</p>
                <input type="text" placeholder="Telefono (+51987654321)" value={phone}
                  onChange={(e) => setPhone(e.target.value)} className={INPUT} style={INPUT_STYLE} />
              </div>
            )}
            <div>
              <Label>Nombre del dueno</Label>
              <input type="text" placeholder="Maria Garcia" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
            </div>
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7c3aed' }}>Mascota</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label>Nombre de la mascota</Label>
                  <input type="text" placeholder="Draco, Luna..." value={inlinePetName} onChange={(e) => setInlinePetName(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div>
                  <Label>Especie</Label>
                  <select value={inlinePetType} onChange={(e) => setInlinePetType(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                    <option value="dog">Perro</option><option value="cat">Gato</option>
                    <option value="bird">Ave</option><option value="rabbit">Conejo</option><option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <Label>Raza (opcional)</Label>
                  <input type="text" placeholder="Labrador..." value={inlinePetBreed} onChange={(e) => setInlinePetBreed(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                </div>
                <div className="col-span-2">
                  <Label>Fecha de nacimiento (opcional)</Label>
                  <input type="date" value={inlineBirthDate} onChange={(e) => setInlineBirthDate(e.target.value)} className={INPUT} style={INPUT_STYLE} />
                </div>
              </div>
            </div>
            {createErr && <p className="text-xs text-red-500">{createErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setStep('search'); setNewOwnerName(''); setInlinePetName(''); setInlinePetBreed(''); setInlineBirthDate(''); setCreateErr('') }}
                className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>Volver</button>
              <button onClick={doCreateInline} disabled={creating}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                style={{ background: '#601EF9' }}>{creating ? 'Creando...' : 'Crear y continuar'}</button>
            </div>
          </div>
        )}
        {step === 'form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
              <span className="text-sm font-semibold" style={{ color: '#601EF9' }}>
                {client?.name ?? client?.phone} · {selectedPet?.name ?? ''} {selectedPet ? (PET_TYPE_LABEL[selectedPet.type] ?? '') : ''}
              </span>
            </div>
            {/* ─── Llegada ──────────────────────────────── */}
            <div>
              <Label>¿Cómo llega la mascota?</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setRequiresPickup(false); setTime('') }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={!requiresPickup
                    ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                    : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                  🏠 Deja en local
                </button>
                <button type="button" onClick={() => { setRequiresPickup(true); setTime(''); setPickupAddress(client?.address ?? '') }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={requiresPickup
                    ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                    : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                  🛵 Recojo a domicilio
                </button>
              </div>
            </div>
            <div className={requiresPickup ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
              <div>
                <Label>Fecha</Label>
                <input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className={INPUT} style={INPUT_STYLE} />
              </div>
              {!requiresPickup && (
                <div>
                  <Label>Hora de llegada</Label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT}
                    style={{ ...INPUT_STYLE, border: slotOk === false ? '1.5px solid #fca5a5' : INPUT_STYLE.border }} />
                </div>
              )}
            </div>
            {requiresPickup && (
              <>
                {pickupWindows.length > 0 ? (
                  <div>
                    <Label>Turno de recojo</Label>
                    <div className="flex flex-wrap gap-2">
                      {pickupWindows.map(w => (
                        <button key={w.value} type="button" onClick={() => setTime(w.value)}
                          className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                          style={time === w.value
                            ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                            : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef9c3', color: '#854d0e' }}>
                    Sin turnos de recojo configurados. Actívalos en Configuración → Logística.
                  </p>
                )}
                <div>
                  <Label>Dirección de recojo</Label>
                  <input type="text" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
                    placeholder="Ej: Av. La Marina 123, Miraflores"
                    className={INPUT} style={INPUT_STYLE} />
                  {!pickupAddress && (
                    <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                      Este cliente no tiene dirección registrada. Ingresa una manualmente.
                    </p>
                  )}
                </div>
              </>
            )}
            {/* ─── Regreso / Entrega ───────────────────── */}
            <div>
              <Label>¿Cómo regresa la mascota?</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setRequiresDelivery(false); setDeliveryTime('') }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={!requiresDelivery
                    ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                    : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                  👤 Cliente la recoge
                </button>
                <button type="button" onClick={() => { setRequiresDelivery(true); setDeliveryTime(''); if (!pickupAddress) setPickupAddress(client?.address ?? '') }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={requiresDelivery
                    ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                    : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                  📦 La llevamos al domicilio
                </button>
              </div>
            </div>
            {requiresDelivery && (
              <>
                {deliveryWindows.length > 0 ? (
                  <div>
                    <Label>Turno de entrega</Label>
                    <div className="flex flex-wrap gap-2">
                      {deliveryWindows.map(w => (
                        <button key={w.value} type="button" onClick={() => setDeliveryTime(w.value)}
                          className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                          style={deliveryTime === w.value
                            ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                            : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#fef9c3', color: '#854d0e' }}>
                    Sin turnos de entrega configurados. Actívalos en Configuración → Logística.
                  </p>
                )}
                {/* Mostrar dirección solo si no se mostró ya en la sección de recojo */}
                {!requiresPickup && (
                  <div>
                    <Label>Dirección de entrega</Label>
                    <input type="text" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
                      placeholder="Ej: Av. La Marina 123, Miraflores"
                      className={INPUT} style={INPUT_STYLE} />
                    {!pickupAddress && (
                      <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                        Este cliente no tiene dirección registrada. Ingresa una manualmente.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            {petId && date && time && (
              <p className="text-xs min-h-[1rem]" style={{ color: slotOk === false ? '#dc2626' : '#94a3b8' }}>
                {slotChecking && 'Comprobando disponibilidad...'}
                {!slotChecking && slotOk === true  && 'Horario disponible'}
                {!slotChecking && slotOk === false && 'Ese horario ya esta ocupado. Elige otra hora.'}
              </p>
            )}
            {serviceTypes.length > 0 && (
              <div>
                <Label>Servicio</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceTypes.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => { setServiceTypeId(prev => prev === s.id ? '' : s.id); if (!notes) setNotes(serviceTypeId === s.id ? '' : s.name) }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                      style={serviceTypeId === s.id
                        ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                        : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                      {s.name}{s.price ? ` · S/${s.price}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Notas (opcional)</Label>
              <input type="text" placeholder="Ej: traer carnet de vacunas" value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} style={INPUT_STYLE} />
            </div>
            {submitErr && <p className="text-red-500 text-xs">{submitErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('found')} className="text-xs font-medium px-3 py-2 rounded-xl" style={{ background: '#f0f4ff', color: '#334155' }}>Volver</button>
              <button onClick={submit} disabled={submitting || !petId || !date || !time || slotOk === false}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
                style={{ background: '#601EF9' }}>{submitting ? 'Agendando...' : 'Confirmar turno'}</button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

// Modal: completar + cobrar
type PaymentMethod = 'cash' | 'transfer' | 'card' | 'yape' | 'other'
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', yape: 'Yape/Plin', other: 'Otro',
}
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'card', 'yape', 'other']

function CompleteWithPaymentModal({ booking, onClose, onDone }: {
  booking: Booking
  onClose: () => void
  onDone:  () => void
}) {
  const toast = useToast()
  const [amount, setAmount]   = useState('')
  const [method, setMethod]   = useState<PaymentMethod>('cash')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    api.getPet(booking.pet.id).then((pet: unknown) => {
      const p = pet as { default_price?: number | null }
      if (p?.default_price) setAmount(p.default_price.toFixed(2))
    }).catch(() => {})
  }, [booking.pet.id])

  const submit = async (withPayment: boolean) => {
    setSaving(true)
    try {
      await api.completeBooking(booking.id)
      if (withPayment) {
        const amt = parseFloat(amount)
        if (!isNaN(amt) && amt > 0) {
          await api.createPayment({
            amount: amt,
            method,
            booking_id: booking.id,
            pet_id: booking.pet.id,
            description: booking.notes || `Servicio: ${booking.pet.name}`,
            date: new Date().toISOString().slice(0, 10),
          })
        }
      }
      toast.success(`Servicio completado${withPayment ? ' y cobro registrado' : ''} ok`)
      onDone()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al completar')
    } finally { setSaving(false) }
  }

  const hasAmount = !isNaN(parseFloat(amount)) && parseFloat(amount) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(17,28,68,0.4)' }} onClick={onClose} />
      <div className="relative rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{ background: '#fff', border: '1px solid #e4ebff' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Completar servicio</h3>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: '#94a3b8' }}>x</button>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: '#F3EEFF' }}>
          <span className="text-2xl">{PET_EMOJI[booking.pet.type] ?? 'pet'}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{booking.pet.name}</p>
            {booking.notes && <p className="text-xs" style={{ color: '#7c3aed' }}>{booking.notes}</p>}
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {booking.time} · {new Date(booking.date + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Monto cobrado (S/)</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" autoFocus className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1.5px solid #e4ebff', background: '#f8faff', color: '#0f172a' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>Metodo de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  className="py-2 px-1 rounded-xl text-xs font-semibold transition-all"
                  style={method === m
                    ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                    : { background: '#f8faff', color: '#475569', border: '1.5px solid #e4ebff' }}>
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => submit(false)} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-40"
            style={{ background: '#f1f5f9', color: '#475569' }}>Solo completar</button>
          <button onClick={() => submit(true)} disabled={saving || !hasAmount}
            className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            {saving ? 'Guardando...' : 'Completar y cobrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Pagina principal
type QuickFilter = 'today' | 'tomorrow' | 'pending' | 'all'

const FILTER_STATUSES: Record<QuickFilter, BookingStatus[]> = {
  today:    ['PENDING', 'CONFIRMED', 'COMPLETED'],
  tomorrow: ['PENDING', 'CONFIRMED', 'COMPLETED'],
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
  const [showModal, setShowModal]           = useState(false)
  const [actionId, setActionId]             = useState<string | null>(null)
  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('new=1')) {
      setShowModal(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

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
      let data: Booking[]
      if (filter === 'all' || filter === 'pending') {
        data = await api.getAllBookings() as Booking[]
      } else {
        data = await api.getBookings(date) as Booking[]
      }
      setBookings(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar servicios')
    } finally { setLoading(false) }
  }, [date, filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    if (action === 'complete') {
      const b = bookings.find(bb => bb.id === id) ?? null
      setCompletingBooking(b)
      return
    }
    if (action === 'cancel') {
      const ok = await confirm({
        title: 'Cancelar servicio',
        message: 'Cancelar este servicio? El horario quedara libre.',
        confirmLabel: 'Si, cancelar', cancelLabel: 'No, volver', variant: 'danger',
      })
      if (!ok) return
    }
    setActionId(id)
    try {
      if (action === 'confirm') { await api.confirmBooking(id); toast.success('Servicio confirmado') }
      if (action === 'cancel')  { await api.cancelBooking(id);  toast.info('Servicio cancelado') }
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    } finally { setActionId(null) }
  }

  const allowedStatuses = FILTER_STATUSES[filter]
  const visible = bookings.filter(b => allowedStatuses.includes(b.status))

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
        <NewBookingModal defaultDate={date} onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }} />
      )}
      {completingBooking && (
        <CompleteWithPaymentModal booking={completingBooking}
          onClose={() => setCompletingBooking(null)}
          onDone={() => { setCompletingBooking(null); load() }} />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex p-1 rounded-xl gap-1" style={{ background: '#F3EEFF' }}>
            {(Object.keys(filterLabels) as QuickFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={filter === f ? { background: '#601EF9', color: '#fff' } : { color: '#601EF9' }}>
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

        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
            style={{ background: '#fff', border: '1px solid #ede9fe' }}>
            <span style={{ color: '#94a3b8' }}><span className="font-bold" style={{ color: '#f59e0b' }}>{counts.pending}</span> pendientes</span>
            <span className="w-px h-3" style={{ background: '#ede9fe' }} />
            <span style={{ color: '#94a3b8' }}><span className="font-bold" style={{ color: '#1d4ed8' }}>{counts.confirmed}</span> confirmados</span>
            <span className="w-px h-3" style={{ background: '#ede9fe' }} />
            <span style={{ color: '#94a3b8' }}><span className="font-bold" style={{ color: '#16a34a' }}>{counts.completed}</span> completados</span>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            <span className="text-base leading-none">+</span> Nuevo servicio
          </button>
        </div>
      </div>
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
          ))}
        </div>
      )}
      {error && (
        <div className="py-4 px-5 rounded-2xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{error}</div>
      )}
      {!loading && !error && visible.length === 0 && (
        <EmptyState onNew={() => setShowModal(true)} filter={filter} />
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe', overflow: 'visible' }}>
          <div className="grid text-[10px] font-semibold uppercase tracking-widest px-4 py-2.5"
            style={{ gridTemplateColumns: '70px 1fr 90px 90px 110px 200px', background: '#F9F9FB', borderBottom: '1px solid #ede9fe', color: '#94a3b8' }}>
            <span>Hora</span><span>Servicio</span><span>Tipo</span><span>Fecha</span><span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
            {visible.map(b => (
              <ServiceRow key={b.id} booking={b} isActioning={actionId === b.id}
                onConfirm={() => handleAction(b.id, 'confirm')}
                onComplete={() => handleAction(b.id, 'complete')}
                onCancel={() => handleAction(b.id, 'cancel')}
                onAssignRoute={() => toast.success('Asignacion a ruta proximamente')} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_ROW_BG: Record<BookingStatus, string> = {
  PENDING:   'transparent',
  CONFIRMED: 'transparent',
  COMPLETED: '#f8fffe',
  CANCELLED: '#fafafa',
}

function ServiceRow({ booking: b, isActioning, onConfirm, onComplete, onCancel, onAssignRoute }: {
  booking: Booking; isActioning: boolean
  onConfirm: () => void; onComplete: () => void; onCancel: () => void; onAssignRoute: () => void
}) {
  const [open, setOpen] = useState(false)
  const isPending   = b.status === 'PENDING'
  const isActive    = b.status === 'PENDING' || b.status === 'CONFIRMED'
  const isCompleted = b.status === 'COMPLETED'

  const dateLabel = new Date(b.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

  return (
    <div className="relative" style={{ background: STATUS_ROW_BG[b.status] }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full"
        style={{ background: isPending ? '#f59e0b' : b.status === 'CONFIRMED' ? '#601EF9' : isCompleted ? '#10b981' : '#e2e8f0' }} />
      <div className="grid items-center px-4 py-3.5 transition-colors"
        style={{ gridTemplateColumns: '70px 1fr 90px 90px 110px 200px' }}
        onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.background = '#FAFAFF' }}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <span className="font-mono text-sm font-bold" style={{ color: isCompleted ? '#94a3b8' : '#0f172a' }}>{b.time}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{PET_EMOJI[b.pet.type] ?? 'pet'}</span>
            <div className="min-w-0">
              <Link href={`/pets/${b.pet.id}`} className="text-sm font-semibold truncate hover:underline"
                style={{ color: isCompleted ? '#94a3b8' : '#601EF9', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                {b.pet.name}
              </Link>
              <div className="flex items-center gap-1.5 flex-wrap">
                {b.notes && <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{b.notes}</p>}
                {b.requires_pickup && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: '#fef3c7', color: '#b45309' }}>🛵 Recojo</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <span className="text-xs font-medium" style={{ color: '#475569' }}>{PET_TYPE_LABEL[b.pet.type] ?? b.pet.type}</span>
        <span className="text-xs font-medium" style={{ color: '#64748b' }}>{dateLabel}</span>
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit flex items-center gap-1"
          style={{ background: STATUS_COLOR[b.status].bg, color: STATUS_COLOR[b.status].text }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_COLOR[b.status].text }} />
          {STATUS_LABEL[b.status]}
        </span>
        <div className="flex items-center justify-end gap-1.5">
          {isActioning ? (
            <span className="text-xs" style={{ color: '#94a3b8' }}>Procesando...</span>
          ) : (
            <>
              {isActive && (
                <button onClick={onAssignRoute}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}>Ruta</button>
              )}
              {isPending && (
                <button onClick={onConfirm}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ background: '#dbeafe', color: '#1e40af' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#bfdbfe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#dbeafe'}>Confirmar</button>
              )}
              {isActive && (
                <button onClick={onComplete}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ background: '#dcfce7', color: '#166534' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}>Listo</button>
              )}
              {isActive && (
                <div className="relative">
                  <button onClick={() => setOpen(o => !o)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: '#f1f5f9', color: '#64748b' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>...</button>
                  {open && (
                    <div className="absolute right-0 top-8 z-50 rounded-xl shadow-lg py-1 min-w-[140px]"
                      style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 8px 24px rgba(96,30,249,0.15)' }}>
                      <DropItem label="Reprogramar" onClick={() => { setOpen(false) }} />
                      <DropItem label="Cancelar" onClick={() => { setOpen(false); onCancel() }} danger />
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
    <button onClick={onClick} className="w-full text-left px-3 py-2 text-xs font-medium transition-colors"
      style={{ color: danger ? '#dc2626' : '#334155' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#fef2f2' : '#F3EEFF'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{label}</button>
  )
}

function EmptyState({ onNew, filter }: { onNew: () => void; filter: QuickFilter }) {
  const messages: Record<QuickFilter, { title: string; sub: string }> = {
    today:    { title: 'Sin servicios para hoy',      sub: 'Agenda el primer servicio del dia.' },
    tomorrow: { title: 'Sin servicios para manana',   sub: 'Planifica la jornada de manana.' },
    pending:  { title: 'Todo al dia',                 sub: 'No hay servicios pendientes de confirmar.' },
    all:      { title: 'Sin servicios en esta fecha', sub: 'Cambia la fecha o crea un nuevo servicio.' },
  }
  const m = messages[filter]
  return (
    <div className="flex flex-col items-center py-16 gap-4 rounded-2xl"
      style={{ background: '#fff', border: '1.5px dashed #ddd6fe' }}>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{m.title}</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{m.sub}</p>
      </div>
      <button onClick={onNew} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>+ Nuevo servicio</button>
    </div>
  )
}

