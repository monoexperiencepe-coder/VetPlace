'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { BookingDrawer } from '@/components/BookingDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Owner {
  id:    string
  name?: string
  phone: string
}

interface PetRow {
  id:                       string
  name:                     string
  type:                     string
  breed?:                   string
  birth_date?:              string
  grooming_frequency_days?: number
  last_grooming_date?:      string
  owner:                    Owner
}

interface VetEvent {
  id:             string
  type:           string
  scheduled_date: string
  status:         string
}

interface Booking {
  id:     string
  date:   string
  time:   string
  status: string
  notes?: string
}

const PET_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾',
}
const PET_LABEL: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(bd: string): string {
  const months = Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 30.5))
  if (months < 12) return `${months}m`
  return `${Math.floor(months / 12)}a`
}

function groomStatus(pet: PetRow): { label: string; color: string; bg: string } {
  if (!pet.grooming_frequency_days) {
    return { label: 'Sin config', color: '#94a3b8', bg: '#f1f5f9' }
  }
  if (!pet.last_grooming_date) {
    return { label: 'Sin baño registrado', color: '#b45309', bg: '#fef9c3' }
  }
  const next = new Date(pet.last_grooming_date)
  next.setDate(next.getDate() + pet.grooming_frequency_days)
  const days = Math.floor((next.getTime() - Date.now()) / 86400000)
  if (days < 0)   return { label: 'Baño vencido',  color: '#dc2626', bg: '#fee2e2' }
  if (days <= 7)  return { label: `Baño en ${days}d`, color: '#b45309', bg: '#fef9c3' }
  return { label: 'Al día', color: '#16a34a', bg: '#dcfce7' }
}

function logisticsKey(petId: string) {
  return `vetplace_logistics_${petId}`
}

function getLogistics(petId: string): 'pickup' | 'walkin' | null {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem(logisticsKey(petId))
  if (v === 'pickup' || v === 'walkin') return v
  return null
}

function setLogistics(petId: string, v: 'pickup' | 'walkin') {
  localStorage.setItem(logisticsKey(petId), v)
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PetsPage() {
  const toast = useToast()

  const [query, setQuery]         = useState('')
  const [pets, setPets]           = useState<PetRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected]   = useState<PetRow | null>(null)
  const [events, setEvents]       = useState<VetEvent[]>([])
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loadingDetail, setLD]    = useState(false)
  const [logistics, setLogisticsState] = useState<'pickup' | 'walkin' | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  // Initial: flatten pets from recent clients
  useEffect(() => {
    api.getRecentClients()
      .then((d: unknown) => {
        const clients = Array.isArray(d)
          ? (d as Array<{ id: string; name?: string; phone: string; pets?: PetRow[] }>)
          : []
        const rows: PetRow[] = []
        clients.forEach(c =>
          (c.pets ?? []).forEach(p =>
            rows.push({ ...p, owner: { id: c.id, name: c.name, phone: c.phone } })
          )
        )
        setPets(rows)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      // reset to recent
      setSearching(true)
      api.getRecentClients()
        .then((d: unknown) => {
          const clients = Array.isArray(d)
            ? (d as Array<{ id: string; name?: string; phone: string; pets?: PetRow[] }>)
            : []
          const rows: PetRow[] = []
          clients.forEach(c =>
            (c.pets ?? []).forEach(p =>
              rows.push({ ...p, owner: { id: c.id, name: c.name, phone: c.phone } })
            )
          )
          setPets(rows)
        })
        .catch(() => {})
        .finally(() => setSearching(false))
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.searchPets(q) as Array<PetRow & { client?: Owner }>
        setPets(
          res.map(p => ({
            ...p,
            owner: p.client ?? { id: '', name: undefined, phone: '' },
          }))
        )
      } catch { setPets([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const pickPet = async (p: PetRow) => {
    setSelected(p)
    setLogisticsState(getLogistics(p.id))
    setLD(true)
    try {
      const [evs, bks] = await Promise.all([
        api.getEventsByPet(p.id) as Promise<VetEvent[]>,
        api.getBookingsByPet(p.id) as Promise<Booking[]>,
      ])
      setEvents(evs)
      setBookings(bks)
    } catch { toast.error('No se pudo cargar el detalle') }
    finally { setLD(false) }
  }

  const handleLogistics = (v: 'pickup' | 'walkin') => {
    if (!selected) return
    setLogistics(selected.id, v)
    setLogisticsState(v)
  }

  const gs = selected ? groomStatus(selected) : null
  const recentHistory = [...bookings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 88px)' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 360 }}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: '#94a3b8' }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar mascota o dueño…"
            className="w-full pl-9 pr-8 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#fff', border: '1.5px solid #ede9fe', color: '#0f172a' }}
            onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
            onBlur={e  => e.currentTarget.style.border = '1.5px solid #ede9fe'}
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: '#601EF9' }}>…</span>
          )}
          {query && !searching && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: '#94a3b8' }}>✕</button>
          )}
        </div>

        <div className="ml-auto shrink-0">
          <Link href="/clients"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            + Nueva mascota
          </Link>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Pet list ── */}
        <div className="flex-1 overflow-y-auto rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          {loading ? (
            <div className="p-3 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
              ))}
            </div>
          ) : pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <span className="text-5xl">🐾</span>
              <p className="text-sm font-semibold" style={{ color: '#334155' }}>
                {query ? 'Sin resultados' : 'Aún no hay mascotas'}
              </p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {query ? 'Intentá con otro nombre' : 'Las mascotas aparecen al agregar clientes'}
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div
                className="grid text-[10px] font-semibold uppercase tracking-widest px-5 py-2.5 sticky top-0 z-10"
                style={{ gridTemplateColumns: '1fr 120px 110px 110px 110px 20px', background: '#F9F9FB', borderBottom: '1px solid #ede9fe', color: '#94a3b8' }}>
                <span>Mascota</span>
                <span>Dueño</span>
                <span>Raza</span>
                <span>Estado baño</span>
                <span>Logística</span>
                <span />
              </div>

              <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {pets.map(p => {
                  const status   = groomStatus(p)
                  const logistic = getLogistics(p.id)
                  return (
                    <button key={p.id} onClick={() => pickPet(p)}
                      className="w-full text-left grid items-center px-5 py-3 transition-colors"
                      style={{
                        gridTemplateColumns: '1fr 120px 110px 110px 110px 20px',
                        background: selected?.id === p.id ? '#FAFAFF' : 'transparent',
                        borderLeft: selected?.id === p.id ? '3px solid #601EF9' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (selected?.id !== p.id) e.currentTarget.style.background = '#FAFAFF' }}
                      onMouseLeave={e => { if (selected?.id !== p.id) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                          style={{ background: '#F3EEFF' }}>
                          {PET_EMOJI[p.type] ?? '🐾'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{p.name}</p>
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                            {PET_LABEL[p.type]}{p.birth_date ? ` · ${calcAge(p.birth_date)}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs truncate" style={{ color: '#64748b' }}>
                        {p.owner.name ?? p.owner.phone}
                      </span>
                      <span className="text-xs truncate" style={{ color: '#94a3b8' }}>
                        {p.breed ?? '—'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
                        style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
                        style={logistic === 'pickup'
                          ? { background: '#dbeafe', color: '#1e40af' }
                          : logistic === 'walkin'
                          ? { background: '#f1f5f9', color: '#64748b' }
                          : { background: '#f9f9fb', color: '#94a3b8' }}>
                        {logistic === 'pickup' ? '🛵 Recojo'
                          : logistic === 'walkin' ? '🚶 Trae'
                          : '—'}
                      </span>
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#c4b5fd" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>

              <p className="text-center text-[11px] py-3" style={{ color: '#cbd5e1' }}>
                {query
                  ? `${pets.length} resultado${pets.length !== 1 ? 's' : ''}`
                  : `${pets.length} mascota${pets.length !== 1 ? 's' : ''} recientes`}
              </p>
            </>
          )}
        </div>

        {/* ── Pasaporte (side panel) ── */}
        {selected && (
          <div className="w-80 shrink-0 overflow-y-auto rounded-2xl flex flex-col"
            style={{ background: '#fff', border: '1px solid #ede9fe' }}>

            {/* Header */}
            <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#F3EEFF' }}>
                    {PET_EMOJI[selected.type] ?? '🐾'}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#601EF9' }}>
                      Pasaporte
                    </p>
                    <p className="text-base font-bold leading-tight" style={{ color: '#0f172a' }}>{selected.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
                      {PET_LABEL[selected.type]}{selected.breed ? ` · ${selected.breed}` : ''}
                      {selected.birth_date ? ` · ${calcAge(selected.birth_date)}` : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setEvents([]); setBookings([]) }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: '#F1F5F9', color: '#94a3b8' }}>×</button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
                ))}
              </div>
            ) : (
              <>
                {/* B. Estado actual */}
                <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Estado actual</p>
                  {gs && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl"
                      style={{ background: gs.bg }}>
                      <span className="text-base">🛁</span>
                      <div>
                        <p className="text-xs font-bold" style={{ color: gs.color }}>{gs.label}</p>
                        {selected.last_grooming_date && (
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                            Último: {new Date(selected.last_grooming_date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Vaccines from events */}
                  {(() => {
                    const pending = events.filter(e => e.type === 'vaccine' && e.status === 'PENDING')
                    return pending.length > 0 ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: '#fee2e2' }}>
                        <span className="text-base">💉</span>
                        <p className="text-xs font-bold" style={{ color: '#dc2626' }}>
                          Vacuna pendiente — {new Date(pending[0].scheduled_date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: '#dcfce7' }}>
                        <span className="text-base">💉</span>
                        <p className="text-xs font-bold" style={{ color: '#16a34a' }}>Vacunas al día</p>
                      </div>
                    )
                  })()}
                </div>

                {/* C. Frecuencia */}
                {selected.grooming_frequency_days && (
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Frecuencia</p>
                    <p className="text-sm" style={{ color: '#334155' }}>
                      ✂️ Baño cada <strong>{selected.grooming_frequency_days} días</strong>
                    </p>
                  </div>
                )}

                {/* D. Logística */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Logística</p>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => handleLogistics('pickup')}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      style={logistics === 'pickup'
                        ? { background: '#601EF9', color: '#fff' }
                        : { background: '#F9F9FB', color: '#475569', border: '1.5px solid #E5E7EB' }}>
                      🛵 Con recojo
                    </button>
                    <button onClick={() => handleLogistics('walkin')}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      style={logistics === 'walkin'
                        ? { background: '#601EF9', color: '#fff' }
                        : { background: '#F9F9FB', color: '#475569', border: '1.5px solid #E5E7EB' }}>
                      🚶 Sin recojo
                    </button>
                  </div>
                  {logistics && (
                    <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                      Valor por defecto al agendar. Puede cambiarse por servicio.
                    </p>
                  )}
                </div>

                {/* A. Dueño */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Dueño</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                      {(selected.owner.name ?? selected.owner.phone)[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>
                        {selected.owner.name ?? 'Sin nombre'}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: '#94a3b8' }}>{selected.owner.phone}</p>
                    </div>
                  </div>
                </div>

                {/* F. Acciones rápidas */}
                <div className="px-4 py-3 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <button onClick={() => setShowBooking(true)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: '#601EF9' }}>
                    📅 Agendar
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/${selected.owner.phone.replace(/\D/g, '')}`, '_blank')}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: '#F3EEFF', color: '#601EF9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}>
                    💬 Recordatorio
                  </button>
                  <Link href={`/pets/${selected.id}`}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: '#F9F9FB', color: '#334155', border: '1px solid #ede9fe' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3EEFF'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F9F9FB'}>
                    Ver perfil completo →
                  </Link>
                </div>

                {/* E. Historial */}
                <div className="px-4 py-3 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
                    Historial reciente
                  </p>
                  {recentHistory.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: '#cbd5e1' }}>Sin servicios registrados</p>
                  ) : (
                    <div className="space-y-1.5">
                      {recentHistory.map(b => (
                        <div key={b.id} className="flex items-center gap-3 py-2 px-2.5 rounded-xl"
                          style={{ background: '#F9F9FB' }}>
                          <span className="text-sm">
                            {b.notes === 'Baño' ? '🛁' : b.notes === 'Vacuna' ? '💉' : b.notes === 'Consulta' ? '🩺' : '📋'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>
                              {b.notes ?? 'Servicio'}
                            </p>
                            <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                              {new Date(b.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} · {b.time}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={b.status === 'COMPLETED'
                              ? { background: '#dcfce7', color: '#16a34a' }
                              : b.status === 'PENDING'
                              ? { background: '#fef9c3', color: '#854d0e' }
                              : { background: '#f1f5f9', color: '#64748b' }}>
                            {b.status === 'COMPLETED' ? 'Completado' : b.status === 'PENDING' ? 'Pendiente' : b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* BookingDrawer */}
      {showBooking && selected && (
        <BookingDrawer
          client={selected.owner}
          initialPets={[{ id: selected.id, name: selected.name, type: selected.type }]}
          defaultPetId={selected.id}
          onClose={() => setShowBooking(false)}
          onCreated={() => setShowBooking(false)}
        />
      )}
    </div>
  )
}
