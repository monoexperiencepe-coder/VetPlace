'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

// ─── Constants ────────────────────────────────────────────────────────────────
export const SERVICE_TYPES = [
  { value: 'Baño',     emoji: '🛁' },
  { value: 'Vacuna',   emoji: '💉' },
  { value: 'Consulta', emoji: '🩺' },
  { value: 'Otro',     emoji: '📋' },
]

export const TIME_SLOTS = [
  { label: '9:00 – 13:00',  value: '09:00' },
  { label: '14:00 – 18:00', value: '14:00' },
]

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const PET_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾',
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PetOption {
  id:   string
  name: string
  type: string
}

export interface BookingDrawerClient {
  id:    string
  name?: string
  phone: string
}

export interface BookingDrawerProps {
  client:       BookingDrawerClient
  initialPets:  PetOption[]
  defaultPetId?: string
  onClose:      () => void
  onCreated:    () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BookingDrawer({
  client,
  initialPets,
  defaultPetId,
  onClose,
  onCreated,
}: BookingDrawerProps) {
  const toast = useToast()

  const [pets, setPets]             = useState<PetOption[]>(initialPets)
  const [loadingPets, setLPets]     = useState(initialPets.length === 0)
  const [petId, setPetId]           = useState(
    defaultPetId ?? (initialPets.length === 1 ? initialPets[0].id : '')
  )
  const [service, setService]       = useState('')
  const [date, setDate]             = useState(todayISO())
  const [timeSlot, setTimeSlot]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialPets.length > 0) return
    api.getPetsByUser(client.id)
      .then((d: unknown) => {
        const list = Array.isArray(d) ? (d as PetOption[]) : []
        setPets(list)
        if (defaultPetId) {
          setPetId(defaultPetId)
        } else if (list.length === 1) {
          setPetId(list[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLPets(false))
  }, [client.id, initialPets.length, defaultPetId])

  const canSubmit = !!(petId && service && date && timeSlot && !submitting)

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await api.createBooking({ pet_id: petId, date, time: timeSlot, notes: service })
      const petName = pets.find(p => p.id === petId)?.name ?? ''
      toast.success(`✓ Servicio creado para ${petName}`)
      onCreated()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear servicio')
    } finally {
      setSubmitting(false)
    }
  }

  const FIELD_STYLE = {
    background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a',
  } as const

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 380,
          background: '#fff',
          boxShadow: '-8px 0 40px rgba(96,30,249,0.12)',
          borderLeft: '1px solid #ede9fe',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#601EF9' }}>
                Agendar servicio
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>
                {client.name ?? client.phone}
              </h3>
              <p className="text-xs mt-0.5 font-mono" style={{ color: '#94a3b8' }}>{client.phone}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5"
              style={{ background: '#F1F5F9', color: '#94a3b8' }}
            >×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Mascota */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: '#334155' }}>
              Mascota <span style={{ color: '#601EF9' }}>*</span>
            </label>
            {loadingPets ? (
              <div className="h-10 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
            ) : pets.length === 0 ? (
              <p className="text-xs py-2" style={{ color: '#94a3b8' }}>
                Este cliente no tiene mascotas registradas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pets.map(p => (
                  <button key={p.id} onClick={() => setPetId(p.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={petId === p.id
                      ? { background: '#F3EEFF', color: '#601EF9', border: '1.5px solid #a78bfa' }
                      : { background: '#F9F9FB', color: '#475569', border: '1.5px solid #E5E7EB' }}>
                    <span>{PET_EMOJI[p.type] ?? '🐾'}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de servicio */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: '#334155' }}>
              Tipo de servicio <span style={{ color: '#601EF9' }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map(s => (
                <button key={s.value} onClick={() => setService(s.value)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                  style={service === s.value
                    ? { background: '#F3EEFF', color: '#601EF9', border: '1.5px solid #a78bfa' }
                    : { background: '#F9F9FB', color: '#475569', border: '1.5px solid #E5E7EB' }}>
                  <span className="text-base">{s.emoji}</span>
                  {s.value}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: '#334155' }}>
              Fecha <span style={{ color: '#601EF9' }}>*</span>
            </label>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={FIELD_STYLE}
              onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
              onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
            />
          </div>

          {/* Rango horario */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: '#334155' }}>
              Rango horario <span style={{ color: '#601EF9' }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map(slot => (
                <button key={slot.value} onClick={() => setTimeSlot(slot.value)}
                  className="py-3 rounded-xl text-sm font-bold transition-all"
                  style={timeSlot === slot.value
                    ? { background: '#601EF9', color: '#fff', border: '1.5px solid #601EF9' }
                    : { background: '#F9F9FB', color: '#475569', border: '1.5px solid #E5E7EB' }}>
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {!canSubmit && !!(petId || service || timeSlot) && (
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              Completá todos los campos para crear el servicio.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: canSubmit ? 'linear-gradient(135deg,#3b10b5,#601EF9)' : '#e2e8f0',
              color:  canSubmit ? '#fff' : '#94a3b8',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}>
            {submitting ? 'Creando servicio…' : 'Crear servicio'}
          </button>
          <button onClick={onClose}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold"
            style={{ color: '#94a3b8' }}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
