'use client'

import { useEffect, useState, use } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Clinic {
  id: string; name: string; slug: string; phone?: string; logo_url?: string
}

interface MedicalRecord {
  id: string; date: string; type: string
  diagnosis?: string; treatment?: string; notes?: string; vet?: string; weight?: number
}

interface VetEvent {
  id: string; type: string; scheduled_date: string; status: string
}

interface Booking {
  id: string; date: string; time: string; status: string; notes?: string; service_type_id?: string
}

interface Pet {
  id: string; name: string; type: string; birth_date?: string; default_price?: number
  medical_records?: MedicalRecord[]
  bookings?: Booking[]
  events?: VetEvent[]
}

interface ClientData {
  id: string; name?: string; phone: string; email?: string; address?: string; portal_token: string
  clinic: Clinic
  pets: Pet[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PET_EMOJI: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🦜', rabbit: '🐰', other: '🐾' }
const PET_LABEL: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }

const RECORD_LABEL: Record<string, string> = {
  consultation: 'Consulta', vaccine: 'Vacuna', deworming: 'Desparasitación',
  surgery: 'Cirugía', grooming: 'Baño / Estética', other: 'Otro',
}
const RECORD_COLOR: Record<string, string> = {
  consultation: '#dbeafe', vaccine: '#dcfce7', deworming: '#fef9c3',
  surgery: '#fce7f3', grooming: '#fff7ed', other: '#f1f5f9',
}
const RECORD_TEXT: Record<string, string> = {
  consultation: '#1e40af', vaccine: '#166534', deworming: '#854d0e',
  surgery: '#9d174d', grooming: '#9a3412', other: '#475569',
}

const EVENT_LABEL: Record<string, string> = {
  vaccine: 'Vacuna', checkup: 'Control', grooming: 'Baño', deworming: 'Desparasitación',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', COMPLETED: 'Completado', CANCELLED: 'Cancelado',
}

function calcAge(birthDate?: string): string {
  if (!birthDate) return ''
  const diff = Date.now() - new Date(birthDate).getTime()
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30))
  if (years >= 1) return `${years} año${years > 1 ? 's' : ''}`
  return `${months} mes${months !== 1 ? 'es' : ''}`
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ slug, clinic, onSuccess }: {
  slug: string
  clinic: Clinic | null
  onSuccess: (token: string) => void
}) {
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleLogin = async () => {
    const clean = phone.replace(/\D/g, '')
    if (clean.length < 7) { setError('Ingresa un número válido'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, clinic_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'No se pudo ingresar'); return }
      onSuccess(data.data?.token ?? data.token)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'linear-gradient(160deg,#f5f0ff 0%,#ffffff 60%)' }}>

      {/* Logo libre, sin contenedor ni texto repetido */}
      <div className="flex flex-col items-center mb-10">
        {clinic?.logo_url
          ? <img src={clinic.logo_url} alt={clinic.name} className="w-28 h-28 object-contain" />
          : <img src="/logo.png" alt="VetPlace" className="w-28 h-28 object-contain" />
        }
      </div>

      <div className="w-full max-w-xs">
        <h2 className="text-2xl font-bold text-center mb-1" style={{ color: '#0f172a' }}>
          Hola 👋
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: '#64748b' }}>
          Ingresa tu número para ver el pasaporte de tu mascota
        </p>

        <div className="rounded-3xl p-5 shadow-lg" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <input
            type="tel" inputMode="numeric" placeholder="987 654 321"
            value={phone} onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-3"
            style={{ background: '#f8faff', border: '1.5px solid #e4ebff', color: '#0f172a' }}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            {loading ? 'Buscando...' : 'Ver mi pasaporte →'}
          </button>
        </div>

        <p className="text-xs text-center mt-5" style={{ color: '#cbd5e1' }}>
          Powered by VetPlace
        </p>
      </div>
    </div>
  )
}

// ─── Passport Screen ──────────────────────────────────────────────────────────
function PassportScreen({ data }: { data: ClientData }) {
  const { clinic, pets } = data
  const [activePet, setActivePet] = useState(pets[0]?.id ?? '')
  const [tab, setTab] = useState<'citas' | 'historial' | 'eventos'>('citas')

  const pet = pets.find(p => p.id === activePet) ?? pets[0]
  if (!pet) return null

  const whatsappUrl = clinic.phone
    ? `https://wa.me/${clinic.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Soy ${data.name ?? data.phone} y quiero consultar sobre ${pet.name} 🐾`)}`
    : null

  const upcomingBookings = (pet.bookings ?? [])
    .filter(b => b.date >= todayStr() && b.status !== 'CANCELLED')
    .sort((a, b) => a.date.localeCompare(b.date))

  const pastBookings = (pet.bookings ?? [])
    .filter(b => b.date < todayStr() || b.status === 'COMPLETED')
    .sort((a, b) => b.date.localeCompare(a.date))

  const upcomingEvents = (pet.events ?? [])
    .filter(e => e.scheduled_date >= todayStr() && e.status !== 'CANCELLED' && e.status !== 'COMPLETED')
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  const records = [...(pet.medical_records ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  const nextEvent = upcomingEvents[0]
  const nextBooking = upcomingBookings[0]

  return (
    <div className="min-h-screen" style={{ background: '#f8f6ff' }}>

      {/* ── Header ── */}
      <div className="px-4 pt-10 pb-6" style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
        <div className="flex items-center gap-3 mb-5">
          {clinic.logo_url
            ? <img src={clinic.logo_url} alt={clinic.name} className="w-9 h-9 rounded-xl object-contain bg-white" />
            : <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🐾</div>
          }
          <div>
            <p className="text-white/70 text-[11px] font-medium uppercase tracking-wide">Pasaporte</p>
            <p className="text-white text-sm font-bold leading-tight">{clinic.name}</p>
          </div>
        </div>

        {/* Owner card */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
          <p className="text-white/70 text-[11px] mb-0.5">Dueño</p>
          <p className="text-white font-bold text-lg leading-tight">{data.name ?? data.phone}</p>
          <p className="text-white/70 text-xs mt-0.5">{data.phone}{data.address ? ` · ${data.address}` : ''}</p>
        </div>

        {/* Pet tabs */}
        {pets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pets.map(p => (
              <button key={p.id} onClick={() => { setActivePet(p.id); setTab('citas') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={activePet === p.id
                  ? { background: 'rgba(255,255,255,0.95)', color: '#601EF9' }
                  : { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
                {PET_EMOJI[p.type] ?? '🐾'} {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 -mt-2 space-y-4 pb-24">

        {/* ── Pet card ── */}
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ background: '#F3EEFF' }}>
              {PET_EMOJI[pet.type] ?? '🐾'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold" style={{ color: '#0f172a' }}>{pet.name}</h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                {PET_LABEL[pet.type] ?? pet.type}
                {pet.birth_date ? ` · ${calcAge(pet.birth_date)}` : ''}
              </p>
            </div>
          </div>

          {/* Próxima cita o evento */}
          {(nextBooking || nextEvent) && (
            <div className="mt-3 rounded-xl p-3" style={{ background: '#F3EEFF' }}>
              {nextBooking && (
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#601EF9' }}>Próxima cita</p>
                    <p className="text-xs" style={{ color: '#475569' }}>
                      {formatDate(nextBooking.date)} a las {nextBooking.time}
                      {nextBooking.notes ? ` · ${nextBooking.notes}` : ''}
                    </p>
                  </div>
                </div>
              )}
              {!nextBooking && nextEvent && (
                <div className="flex items-center gap-2">
                  <span className="text-base">💉</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#601EF9' }}>Próximo evento</p>
                    <p className="text-xs" style={{ color: '#475569' }}>
                      {EVENT_LABEL[nextEvent.type] ?? nextEvent.type} · {formatDate(nextEvent.scheduled_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: '#ede9fe' }}>
          {(['citas', 'historial', 'eventos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={tab === t
                ? { background: '#601EF9', color: '#fff', boxShadow: '0 2px 8px rgba(96,30,249,0.3)' }
                : { color: '#601EF9' }}>
              {t === 'citas' ? '📅 Citas' : t === 'historial' ? '📋 Historial' : '💉 Eventos'}
            </button>
          ))}
        </div>

        {/* ── Tab: Citas ── */}
        {tab === 'citas' && (
          <div className="space-y-3">
            {upcomingBookings.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: '#601EF9' }}>Próximas</p>
                {upcomingBookings.map(b => (
                  <div key={b.id} className="rounded-2xl p-4 mb-2 shadow-sm" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#0f172a' }}>
                          {formatDate(b.date)} · {b.time}
                        </p>
                        {b.notes && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{b.notes}</p>}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                        style={{
                          background: b.status === 'CONFIRMED' ? '#dbeafe' : '#fef9c3',
                          color: b.status === 'CONFIRMED' ? '#1e40af' : '#854d0e',
                        }}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pastBookings.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: '#94a3b8' }}>Historial de citas</p>
                {pastBookings.slice(0, 5).map(b => (
                  <div key={b.id} className="rounded-2xl p-3 mb-2" style={{ background: '#f8faff', border: '1px solid #e4ebff' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium" style={{ color: '#475569' }}>
                        {formatDate(b.date)}{b.notes ? ` · ${b.notes}` : ''}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: '#dcfce7', color: '#166534' }}>
                        Completado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {upcomingBookings.length === 0 && pastBookings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>Sin citas registradas</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Historial clínico ── */}
        {tab === 'historial' && (
          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>Sin registros clínicos todavía</p>
              </div>
            ) : records.map(r => (
              <div key={r.id} className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: RECORD_COLOR[r.type] ?? '#f1f5f9', color: RECORD_TEXT[r.type] ?? '#475569' }}>
                    {RECORD_LABEL[r.type] ?? r.type}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{formatDate(r.date)}</span>
                </div>
                {r.diagnosis && <p className="text-xs font-medium mb-1" style={{ color: '#0f172a' }}>{r.diagnosis}</p>}
                {r.treatment && <p className="text-xs mb-1" style={{ color: '#475569' }}>💊 {r.treatment}</p>}
                {r.notes && <p className="text-xs" style={{ color: '#64748b' }}>{r.notes}</p>}
                <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                  {r.vet && <span className="text-[11px]" style={{ color: '#94a3b8' }}>👨‍⚕️ {r.vet}</span>}
                  {r.weight && <span className="text-[11px]" style={{ color: '#94a3b8' }}>⚖️ {r.weight} kg</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Eventos ── */}
        {tab === 'eventos' && (
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">💉</p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>Sin eventos próximos</p>
              </div>
            ) : upcomingEvents.map(e => {
              const daysUntil = Math.ceil((new Date(e.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const urgent = daysUntil <= 7
              return (
                <div key={e.id} className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: `1px solid ${urgent ? '#fecaca' : '#ede9fe'}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{e.type === 'vaccine' ? '💉' : e.type === 'grooming' ? '✂️' : e.type === 'deworming' ? '💊' : '🏥'}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{EVENT_LABEL[e.type] ?? e.type}</p>
                        <p className="text-xs" style={{ color: '#64748b' }}>{formatDate(e.scheduled_date)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: urgent ? '#fef2f2' : '#f0fdf4', color: urgent ? '#dc2626' : '#16a34a' }}>
                      {urgent ? `¡En ${daysUntil}d!` : `En ${daysUntil}d`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Bottom CTA bar ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, #f8f6ff 80%, transparent)' }}>
        <div className="flex gap-3 max-w-sm mx-auto">
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Hola! Soy ${data.name ?? data.phone} y quisiera agendar una cita para ${pet.name} 📅`)
              const num = clinic.phone?.replace(/\D/g, '') ?? ''
              window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
            }}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: '#25D366', boxShadow: '0 4px 16px rgba(37,211,102,0.4)' }}>
            <span className="text-lg">💬</span> WhatsApp
          </button>
          {whatsappUrl && (
            <button
              onClick={() => {
                const msg = encodeURIComponent(`Hola! Quisiera agendar una cita para ${pet.name} 🐾`)
                const num = clinic.phone?.replace(/\D/g, '') ?? ''
                window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
              }}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', boxShadow: '0 4px 16px rgba(96,30,249,0.35)' }}>
              <span className="text-base">📅</span> Agendar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [clinic, setClinic]       = useState<Clinic | null>(null)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')

  // Intentar acceso directo por token desde URL (?t=...)
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t')

    // Cargar info pública de la clínica
    fetch(`/api/portal/clinic/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.id) setClinic(d) })
      .catch(() => {})

    if (token) {
      fetch(`/api/portal/token?t=${token}`)
        .then(r => r.json())
        .then(d => {
          if (d.id) {
            setClientData(d)
            // Guardar token en sessionStorage para refrescos
            sessionStorage.setItem(`portal_token_${slug}`, token)
          } else {
            setLoadError(d.error ?? 'Link inválido')
          }
        })
        .catch(() => setLoadError('Error al cargar'))
        .finally(() => setLoading(false))
      return
    }

    // Sin token — verificar si hay sesión guardada
    const saved = sessionStorage.getItem(`portal_token_${slug}`)
    if (saved) {
      fetch(`/api/portal/token?t=${saved}`)
        .then(r => r.json())
        .then(d => { if (d.id) setClientData(d) })
        .catch(() => {})
        .finally(() => setLoading(false))
      return
    }

    setLoading(false)
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg,#f5f0ff,#ffffff)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(160deg,#f5f0ff,#ffffff)' }}>
        <p className="text-4xl mb-3">🔗</p>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#0f172a' }}>Link inválido</h2>
        <p className="text-sm text-center" style={{ color: '#64748b' }}>{loadError}</p>
      </div>
    )
  }

  if (!clientData) {
    return (
      <LoginScreen
        slug={slug}
        clinic={clinic}
        onSuccess={(token) => {
          sessionStorage.setItem(`portal_token_${slug}`, token)
          window.location.href = `/p/${slug}?t=${token}`
        }}
      />
    )
  }

  return <PassportScreen data={clientData} />
}
