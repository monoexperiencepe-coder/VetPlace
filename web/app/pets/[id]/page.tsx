'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'

function NewEventModal({ petId, onClose, onCreated }: { petId: string; onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const [type, setType] = useState('vaccine')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    setSubmitting(true); setError('')
    try {
      await api.createEvent({ pet_id: petId, type, scheduled_date: date })
      toast.success('Evento creado correctamente'); onCreated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear evento'
      setError(msg); toast.error(msg)
    } finally { setSubmitting(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">Nuevo evento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">x</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="vaccine">Vacuna</option>
              <option value="checkup">Control</option>
              <option value="deworming">Desparasitacion</option>
              <option value="grooming">Bano</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha programada</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={submit} disabled={submitting} className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Creando...' : 'Crear evento'}</button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

interface User { id: string; phone: string; name?: string }
interface Pet { id: string; name: string; type: string; breed?: string; birth_date?: string; grooming_frequency_days?: number; last_grooming_date?: string; user: User }
type MedicalRecordType = 'consultation' | 'vaccine' | 'deworming' | 'surgery' | 'grooming' | 'other'
interface MedicalRecord { id: string; pet_id: string; date: string; type: MedicalRecordType; diagnosis?: string; treatment?: string; notes?: string; vet?: string; weight?: number; created_at: string }
type EventStatus = 'PENDING' | 'NOTIFIED' | 'COMPLETED' | 'CANCELLED'
type EventType = 'grooming' | 'vaccine' | 'checkup' | 'deworming'
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
interface VetEvent { id: string; type: EventType; scheduled_date: string; status: EventStatus }
interface Booking { id: string; date: string; time: string; status: BookingStatus; notes?: string }

const RECORD_TYPE_LABEL: Record<MedicalRecordType, string> = { consultation: 'Consulta', vaccine: 'Vacuna', deworming: 'Desparasitacion', surgery: 'Cirugia', grooming: 'Bano / Estetica', other: 'Otro' }
const RECORD_TYPE_ICON: Record<MedicalRecordType, string> = { consultation: 'C', vaccine: 'V', deworming: 'D', surgery: 'Q', grooming: 'B', other: 'O' }
const RECORD_TYPE_COLOR: Record<MedicalRecordType, { bg: string; text: string; dot: string }> = {
  consultation: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  vaccine:      { bg: '#f0fdf4', text: '#166534', dot: '#22c55e' },
  deworming:    { bg: '#fefce8', text: '#854d0e', dot: '#eab308' },
  surgery:      { bg: '#fdf4ff', text: '#7e22ce', dot: '#a855f7' },
  grooming:     { bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
  other:        { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
}
const PET_EMOJI: Record<string, string> = { dog: 'D', cat: 'C', bird: 'B', rabbit: 'R', other: 'O' }
const PET_TYPE_LABEL: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }
const EVENT_TYPE_LABEL: Record<EventType, string> = { grooming: 'Bano', vaccine: 'Vacuna', checkup: 'Control', deworming: 'Desparasitacion' }
const EVENT_STATUS_LABEL: Record<EventStatus, string> = { PENDING: 'Pendiente', NOTIFIED: 'Notificado', COMPLETED: 'Completado', CANCELLED: 'Cancelado' }
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: '#fef9c3', text: '#854d0e' },
  NOTIFIED:  { bg: '#dbeafe', text: '#1e40af' },
  CONFIRMED: { bg: '#dbeafe', text: '#1e40af' },
  COMPLETED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#f1f5f9', text: '#64748b' },
}
const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = { PENDING: 'Pendiente', CONFIRMED: 'Confirmado', COMPLETED: 'Completado', CANCELLED: 'Cancelado' }
function calcAge(birthDate: string): string {
  const birth = new Date(birthDate); const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months < 12) return `${months} mes${months !== 1 ? 'es' : ''}`
  const years = Math.floor(months / 12); return `${years} anio${years !== 1 ? 's' : ''}`
}

function EditPetModal({ pet, onClose, onUpdated }: { pet: Pet; onClose: () => void; onUpdated: (p: Pet) => void }) {
  const toast = useToast()
  const [name, setName] = useState(pet.name)
  const [type, setType] = useState(pet.type)
  const [breed, setBreed] = useState(pet.breed ?? '')
  const [birthDate, setBirthDate] = useState(pet.birth_date ?? '')
  const [groomFreq, setGroomFreq] = useState(pet.grooming_frequency_days?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.warning('El nombre es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const data = await api.updatePet(pet.id, { name: name.trim(), type, breed: breed.trim() || undefined, birth_date: birthDate || undefined, grooming_frequency_days: groomFreq ? Number(groomFreq) : null }) as Pet
      onUpdated(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar'
      setErr(msg); toast.error(msg)
    } finally { setSaving(false) }
  }
  const cls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Editar mascota</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">x</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre *</label><input value={name} onChange={e => setName(e.target.value)} required autoFocus className={cls} /></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Especie</label>
            <select value={type} onChange={e => setType(e.target.value)} className={cls}>
              <option value="dog">Perro</option><option value="cat">Gato</option><option value="bird">Ave</option><option value="rabbit">Conejo</option><option value="other">Otro</option>
            </select>
          </div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Raza</label><input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Labrador, Siames..." className={cls} /></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha de nacimiento</label><input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={cls} /></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Frecuencia de bano (dias)</label><input type="number" value={groomFreq} onChange={e => setGroomFreq(e.target.value)} placeholder="30" className={cls} /></div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: '#601EF9' }}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MedicalRecordModal({ petId, record, onClose, onSaved }: { petId: string; record?: MedicalRecord; onClose: () => void; onSaved: (r: MedicalRecord) => void }) {
  const toast = useToast()
  const isEdit = !!record
  const [type, setType] = useState<MedicalRecordType>(record?.type ?? 'consultation')
  const [date, setDate] = useState(record?.date ?? new Date().toISOString().slice(0, 10))
  const [diagnosis, setDiagnosis] = useState(record?.diagnosis ?? '')
  const [treatment, setTreatment] = useState(record?.treatment ?? '')
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [vet, setVet] = useState(record?.vet ?? '')
  const [weight, setWeight] = useState(record?.weight?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr('')
    const body = { date, type, diagnosis: diagnosis.trim() || undefined, treatment: treatment.trim() || undefined, notes: notes.trim() || undefined, vet: vet.trim() || undefined, weight: weight ? Number(weight) : null }
    try {
      let saved: MedicalRecord
      if (isEdit && record) { saved = await api.updateMedicalRecord(record.id, body) as MedicalRecord }
      else { saved = await api.createMedicalRecord({ pet_id: petId, ...body }) as MedicalRecord }
      onSaved(saved)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      setErr(msg); toast.error(msg)
    } finally { setSaving(false) }
  }
  const cls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: '1px solid #f0f4ff' }}>
          <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>{isEdit ? 'Editar registro' : 'Nueva entrada'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: '#F1F5F9', color: '#94a3b8' }}>x</button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">
          <form id="mr-form" onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Tipo</label>
                <select value={type} onChange={e => setType(e.target.value as MedicalRecordType)} className={cls}>
                  <option value="consultation">Consulta</option><option value="vaccine">Vacuna</option><option value="deworming">Desparasitacion</option><option value="surgery">Cirugia</option><option value="grooming">Bano / Estetica</option><option value="other">Otro</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Fecha *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className={cls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Veterinario</label><input value={vet} onChange={e => setVet(e.target.value)} placeholder="Dr. Garcia" className={cls} /></div>
              <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Peso (kg)</label><input type="number" step="0.01" min="0" value={weight} onChange={e => setWeight(e.target.value)} placeholder="4.5" className={cls} /></div>
            </div>
            <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Diagnostico / Motivo</label><textarea rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Describe el diagnostico..." className={`${cls} resize-none`} /></div>
            <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Tratamiento</label><textarea rows={2} value={treatment} onChange={e => setTreatment(e.target.value)} placeholder="Medicamentos, procedimientos..." className={`${cls} resize-none`} /></div>
            <div><label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Notas adicionales</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones, proximo control..." className={`${cls} resize-none`} /></div>
            {err && <p className="text-red-500 text-xs">{err}</p>}
          </form>
        </div>
        <div className="px-6 py-4 flex gap-3 shrink-0" style={{ borderTop: '1px solid #f0f4ff' }}>
          <button form="mr-form" type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar registro'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#F1F5F9', color: '#334155' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function PetDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const petId   = params.id as string
  const toast   = useToast()
  const confirm = useConfirm()

  const [pet, setPet]       = useState<Pet | null>(null)
  const [events, setEvents] = useState<VetEvent[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [records, setRecords]   = useState<MedicalRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showNewEvent, setShowNewEvent]       = useState(false)
  const [showEditPet, setShowEditPet]         = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingRecord, setEditingRecord]     = useState<MedicalRecord | undefined>()
  const [markingGrooming, setMarkingGrooming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [petData, eventsData, bookingsData, recordsData] = await Promise.all([
        api.getPet(petId) as Promise<Pet>,
        api.getEventsByPet(petId) as Promise<VetEvent[]>,
        api.getBookingsByPet(petId) as Promise<Booking[]>,
        api.getMedicalRecords(petId) as Promise<MedicalRecord[]>,
      ])
      setPet(petData); setEvents(eventsData); setBookings(bookingsData); setRecords(recordsData)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar mascota')
    } finally { setLoading(false) }
  }, [petId])

  useEffect(() => { load() }, [load])

  const markGroomingCompleted = async () => {
    if (!pet) return
    setMarkingGrooming(true)
    try {
      const { meta } = await api.groomingCompleted(pet.id)
      const parts: string[] = ['Bano registrado']
      if (meta && meta.grooming_events_completed > 0) parts.push(`${meta.grooming_events_completed} recordatorio(s) de bano cerrado(s)`)
      if (meta?.next_grooming_event_created) parts.push('proximo bano programado')
      toast.success(parts.join('. ') + '.'); load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo registrar el bano')
    } finally { setMarkingGrooming(false) }
  }

  const handleEventAction = async (id: string, action: 'complete' | 'cancel') => {
    if (action === 'cancel') {
      const ok = await confirm({ title: 'Cancelar evento', message: 'Seguro que queres cancelar este evento?', confirmLabel: 'Si, cancelar', cancelLabel: 'No, volver', variant: 'danger' })
      if (!ok) return
    }
    try {
      if (action === 'complete') { await api.completeEvent(id); toast.success('Evento completado') }
      else { await api.cancelEvent(id); toast.info('Evento cancelado') }
      load()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al actualizar el evento') }
  }

  const handleBookingAction = async (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    if (action === 'cancel') {
      const ok = await confirm({ title: 'Cancelar cita', message: 'Seguro que queres cancelar esta cita?', confirmLabel: 'Si, cancelar', cancelLabel: 'No, volver', variant: 'danger' })
      if (!ok) return
    }
    try {
      if (action === 'confirm') { await api.confirmBooking(id); toast.success('Cita confirmada') }
      if (action === 'complete') { await api.completeBooking(id); toast.success('Cita completada') }
      if (action === 'cancel') { await api.cancelBooking(id); toast.info('Cita cancelada') }
      load()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al actualizar la cita') }
  }

  if (loading) return <p className="text-sm mt-8" style={{ color: '#94a3b8' }}>Cargando...</p>
  if (error || !pet) return (
    <div className="mt-8">
      <p className="text-red-500 text-sm mb-4">{error || 'Mascota no encontrada'}</p>
      <button onClick={() => router.back()} className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Volver</button>
    </div>
  )

  return (
    <div className="max-w-3xl">
      {showNewEvent && <NewEventModal petId={petId} onClose={() => setShowNewEvent(false)} onCreated={() => { setShowNewEvent(false); load() }} />}
      {showEditPet && (
        <EditPetModal pet={pet} onClose={() => setShowEditPet(false)} onUpdated={(updated) => { setPet(prev => prev ? { ...prev, ...updated } : prev); setShowEditPet(false); toast.success('Mascota actualizada') }} />
      )}
      {showRecordModal && (
        <MedicalRecordModal
          petId={petId}
          record={editingRecord}
          onClose={() => { setShowRecordModal(false); setEditingRecord(undefined) }}
          onSaved={(saved) => {
            if (editingRecord) { setRecords(prev => prev.map(r => r.id === saved.id ? saved : r)); toast.success('Registro actualizado') }
            else { setRecords(prev => [saved, ...prev]); toast.success('Registro agregado') }
            setShowRecordModal(false); setEditingRecord(undefined)
          }}
        />
      )}

      <nav className="text-xs mb-5 flex items-center gap-2" style={{ color: '#94a3b8' }}>
        <Link href="/clients" className="hover:underline">Clientes</Link>
        <span>&#8250;</span>
        <span>{pet.user.name ?? pet.user.phone}</span>
        <span>&#8250;</span>
        <span className="font-semibold" style={{ color: '#334155' }}>{pet.name}</span>
      </nav>

      <div className="rounded-2xl p-6 mb-5" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
        <div className="flex items-start gap-4">
          <div className="text-5xl leading-none" style={{ fontFamily: 'serif' }}>{PET_EMOJI[pet.type] ?? pet.type[0]}</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-0.5" style={{ color: '#0f172a' }}>{pet.name}</h2>
            <p className="text-sm" style={{ color: '#64748b' }}>{PET_TYPE_LABEL[pet.type] ?? pet.type}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <InfoItem label="Dueno" value={pet.user.name ?? '—'} />
              <InfoItem label="Telefono" value={pet.user.phone} />
              {pet.birth_date && <InfoItem label="Edad" value={calcAge(pet.birth_date)} />}
              {pet.breed && <InfoItem label="Raza" value={pet.breed} />}
              {pet.grooming_frequency_days ? <InfoItem label="Frecuencia de bano" value={`cada ${pet.grooming_frequency_days} dias`} /> : null}
              {pet.last_grooming_date ? <InfoItem label="Ultimo bano" value={pet.last_grooming_date} /> : null}
            </div>
            {pet.grooming_frequency_days ? (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f0f4ff' }}>
                <button onClick={markGroomingCompleted} disabled={markingGrooming} className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50" style={{ background: '#0d9488' }}>
                  {markingGrooming ? 'Guardando...' : 'Marcar bano completado hoy'}
                </button>
              </div>
            ) : null}
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #f0f4ff' }}>
              <button onClick={() => setShowEditPet(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl" style={{ background: '#f0f4ff', color: '#601EF9' }}>Editar</button>
              <button onClick={async () => {
                const ok = await confirm({ title: 'Eliminar mascota', message: `Eliminar a ${pet.name}? Se eliminaran todos sus eventos y citas. Esta accion no se puede deshacer.`, confirmLabel: 'Si, eliminar', cancelLabel: 'Cancelar', variant: 'danger' })
                if (!ok) return
                try { await api.deletePet(pet.id); toast.success(`${pet.name} eliminada`); router.push('/clients') }
                catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar') }
              }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl" style={{ background: '#fef2f2', color: '#dc2626' }}>Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Historia clinica <span className="font-normal" style={{ color: '#94a3b8' }}>({records.length})</span></h3>
          <button onClick={() => { setEditingRecord(undefined); setShowRecordModal(true) }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#F3EEFF', color: '#601EF9' }}>+ Nueva entrada</button>
        </div>
        {records.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center justify-center py-10 gap-2" style={{ background: '#fff', border: '1px solid #e4ebff' }}>
            <p className="text-sm font-semibold" style={{ color: '#334155' }}>Sin registros clinicos</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Agrega consultas, vacunas, cirugias y mas</p>
            <button onClick={() => { setEditingRecord(undefined); setShowRecordModal(true) }} className="mt-2 text-xs font-semibold px-4 py-2 rounded-xl text-white" style={{ background: '#601EF9' }}>+ Primera entrada</button>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-3 bottom-3 w-px" style={{ background: '#e4ebff' }} />
            <div className="space-y-3">
              {records.map(rec => (
                <MedicalRecordCard key={rec.id} record={rec}
                  onEdit={() => { setEditingRecord(rec); setShowRecordModal(true) }}
                  onDelete={async () => {
                    const ok = await confirm({ title: 'Eliminar registro', message: 'Eliminar este registro clinico? Esta accion no se puede deshacer.', confirmLabel: 'Si, eliminar', cancelLabel: 'Cancelar', variant: 'danger' })
                    if (!ok) return
                    try { await api.deleteMedicalRecord(rec.id); setRecords(prev => prev.filter(r => r.id !== rec.id)); toast.success('Registro eliminado') }
                    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar') }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm" style={{ color: '#0f172a' }}>Eventos <span className="font-normal" style={{ color: '#94a3b8' }}>({events.length})</span></h3>
          <button onClick={() => setShowNewEvent(true)} className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>+ Nuevo evento</button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
          {events.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>Sin eventos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8faff', borderBottom: '1px solid #e4ebff' }}>
                <tr>{['Tipo', 'Fecha', 'Estado', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={ev.id} style={{ borderTop: i > 0 ? '1px solid #f0f4ff' : undefined }} onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: '#334155' }}>{EVENT_TYPE_LABEL[ev.type]}</td>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#64748b' }}>{ev.scheduled_date}</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: STATUS_COLORS[ev.status].bg, color: STATUS_COLORS[ev.status].text }}>{EVENT_STATUS_LABEL[ev.status]}</span></td>
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

      <section>
        <h3 className="font-semibold text-sm mb-3" style={{ color: '#0f172a' }}>Historial de citas <span className="font-normal" style={{ color: '#94a3b8' }}>({bookings.length})</span></h3>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
          {bookings.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: '#94a3b8' }}>Sin citas registradas</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8faff', borderBottom: '1px solid #e4ebff' }}>
                <tr>{['Fecha', 'Hora', 'Notas', 'Estado', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id} style={{ borderTop: i > 0 ? '1px solid #f0f4ff' : undefined }} onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#64748b' }}>{b.date}</td>
                    <td className="px-5 py-3.5 font-mono font-bold" style={{ color: '#0f172a' }}>{b.time}</td>
                    <td className="px-5 py-3.5" style={{ color: '#94a3b8' }}>{b.notes ?? '—'}</td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: STATUS_COLORS[b.status].bg, color: STATUS_COLORS[b.status].text }}>{BOOKING_STATUS_LABEL[b.status]}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 justify-end">
                        {b.status === 'PENDING' && <Btn onClick={() => handleBookingAction(b.id, 'confirm')} variant="blue">Confirmar</Btn>}
                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (<><Btn onClick={() => handleBookingAction(b.id, 'complete')} variant="green">Completar</Btn><Btn onClick={() => handleBookingAction(b.id, 'cancel')} variant="ghost">Cancelar</Btn></>)}
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

function MedicalRecordCard({ record, onEdit, onDelete }: { record: MedicalRecord; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const colors = RECORD_TYPE_COLOR[record.type]
  const hasDetail = record.diagnosis || record.treatment || record.notes
  return (
    <div className="relative pl-12">
      <div className="absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 border-white" style={{ background: colors.dot, boxShadow: `0 0 0 2px ${colors.dot}33` }} />
      <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #e4ebff' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0" style={{ background: colors.bg, color: colors.text }}>{RECORD_TYPE_LABEL[record.type]}</span>
            <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{record.date}</span>
            {record.vet && <span className="text-xs truncate" style={{ color: '#64748b' }}>· {record.vet}</span>}
            {record.weight ? <span className="text-xs font-semibold shrink-0" style={{ color: '#601EF9' }}>{record.weight} kg</span> : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasDetail && <button onClick={() => setExpanded(e => !e)} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#f8faff', color: '#601EF9' }}>{expanded ? 'Menos' : 'Ver'}</button>}
            <button onClick={onEdit} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#f0f4ff', color: '#601EF9' }}>Editar</button>
            <button onClick={onDelete} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>Eliminar</button>
          </div>
        </div>
        {!expanded && record.diagnosis && <p className="text-xs mt-2 truncate" style={{ color: '#64748b' }}>{record.diagnosis}</p>}
        {expanded && hasDetail && (
          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid #f0f4ff' }}>
            {record.diagnosis && <div><p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Diagnostico</p><p className="text-sm" style={{ color: '#334155' }}>{record.diagnosis}</p></div>}
            {record.treatment && <div><p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Tratamiento</p><p className="text-sm" style={{ color: '#334155' }}>{record.treatment}</p></div>}
            {record.notes && <div><p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Notas</p><p className="text-sm" style={{ color: '#475569' }}>{record.notes}</p></div>}
          </div>
        )}
      </div>
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
  return <button onClick={onClick} className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80" style={s[variant]}>{children}</button>
}
