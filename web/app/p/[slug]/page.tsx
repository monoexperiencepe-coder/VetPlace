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

// ─── Register Screen ──────────────────────────────────────────────────────────
function RegisterScreen({ slug, clinic, onBack, onSuccess }: {
  slug: string
  clinic: Clinic | null
  onBack: () => void
  onSuccess: (token: string) => void
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', pet_name: '', pet_type: 'dog' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleRegister = async () => {
    if (!form.name.trim()) { setError('Ingresa tu nombre'); return }
    if (form.phone.replace(/\D/g, '').length < 7) { setError('Ingresa un número válido'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: form.phone.replace(/\D/g, ''), clinic_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al registrarse'); return }
      onSuccess(data.data?.token ?? data.token)
    } finally { setLoading(false) }
  }

  const PET_TYPES = [{ v: 'dog', l: '🐶 Perro' }, { v: 'cat', l: '🐱 Gato' }, { v: 'bird', l: '🦜 Ave' }, { v: 'rabbit', l: '🐰 Conejo' }, { v: 'other', l: '🐾 Otro' }]

  return (
    <div className="min-h-screen flex items-start justify-center p-5 pt-8" style={{ background: '#F4F4F8' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-white">
        <div className="relative flex flex-col items-center justify-center py-8 px-6 overflow-hidden"
          style={{ background: 'linear-gradient(145deg,#3b10b5 0%,#601EF9 55%,#7c3aff 100%)' }}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle,#fff 0%,transparent 70%)' }} />
          <div className="relative z-10 flex flex-col items-center">
            {clinic?.logo_url
              ? <img src={clinic.logo_url} alt={clinic?.name} className="h-14 object-contain mb-2 drop-shadow-lg" />
              : <img src="/logo.png" alt="VetPlace" className="h-14 object-contain mb-2 drop-shadow-lg" style={{ filter: 'brightness(0) invert(1)' }} />
            }
            <p className="text-white/70 text-xs mt-1">{clinic?.name ?? 'VetPlace'}</p>
          </div>
        </div>
        <div className="px-7 py-6 flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Crear cuenta 🐾</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Registra tus datos para acceder al pasaporte de tu mascota</p>
          </div>
          {[
            { label: 'Tu nombre completo *', key: 'name' as const, placeholder: 'María García', type: 'text' },
            { label: 'Celular *', key: 'phone' as const, placeholder: '987 654 321', type: 'tel' },
            { label: 'Email (opcional)', key: 'email' as const, placeholder: 'maria@email.com', type: 'email' },
            { label: 'Nombre de tu mascota', key: 'pet_name' as const, placeholder: 'Max', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>{label}</label>
              <input type={type} placeholder={placeholder} value={form[key]} onChange={set(key)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a', fontSize: '16px' }}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid #601EF9')}
                onBlur={e  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')} />
            </div>
          ))}
          {form.pet_name && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Tipo de mascota</label>
              <select value={form.pet_type} onChange={set('pet_type')}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a', fontSize: '16px' }}>
                {PET_TYPES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
          )}
          {error && <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{error}</div>}
          <button onClick={handleRegister} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 100%)' }}>
            {loading ? 'Registrando...' : 'Crear cuenta →'}
          </button>
          <button onClick={onBack} className="w-full text-sm text-center font-medium" style={{ color: '#94a3b8' }}>
            ← Ya tengo cuenta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ slug, clinic, onSuccess }: {
  slug: string
  clinic: Clinic | null
  onSuccess: (token: string) => void
}) {
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showRegister, setShowRegister] = useState(false)

  if (showRegister) {
    return <RegisterScreen slug={slug} clinic={clinic} onBack={() => setShowRegister(false)} onSuccess={onSuccess} />
  }

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
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: '#F4F4F8' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-white">

        {/* Header morado — igual al panel derecho del login de clínica */}
        <div className="relative flex flex-col items-center justify-center py-10 px-6 overflow-hidden"
          style={{ background: 'linear-gradient(145deg,#3b10b5 0%,#601EF9 55%,#7c3aff 100%)' }}>
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle,#fff 0%,transparent 70%)' }} />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full opacity-10"
            style={{ background: '#fff' }} />
          <div className="relative z-10 flex flex-col items-center">
            {clinic?.logo_url
              ? <img src={clinic.logo_url} alt={clinic?.name} className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
              : <img src="/logo.png" alt="VetPlace" className="w-16 h-16 object-contain mb-3 drop-shadow-lg" style={{ filter: 'brightness(0) invert(1)' }} />
            }
            <p className="text-white font-bold text-base">{clinic?.name ?? 'VetPlace'}</p>
            <p className="text-white/60 text-xs mt-0.5">Pasaporte de mascotas</p>
          </div>
        </div>

        {/* Formulario — mismo estilo que login de clínica */}
        <div className="px-7 py-8 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Bienvenido 👋</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Ingresa tu celular para ver el pasaporte de tu mascota
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>
              Número de celular
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <input
                type="tel" inputMode="numeric" placeholder="987 654 321"
                value={phone} onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a', fontSize: '16px' }}
                onFocus={e => (e.currentTarget.style.border = '1.5px solid #601EF9')}
                onBlur={e  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 100%)' }}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Buscando...
                </span>
              : 'Ver mi pasaporte →'}
          </button>

          <p className="text-center text-[11px]" style={{ color: '#c8c8d0' }}>
            © {new Date().getFullYear()} VetPlace. Todos los derechos reservados.
          </p>
        </div>
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
            : <img src="/logo.png" alt="VetPlace" className="w-9 h-9 rounded-xl object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          }
          <div className="flex-1">
            <p className="text-white/70 text-[11px] font-medium uppercase tracking-wide">Pasaporte</p>
            <p className="text-white text-sm font-bold leading-tight">{clinic.name}</p>
          </div>
          {/* Botón cerrar sesión */}
          <button
            onClick={() => {
              // Limpiar sesión de todas las keys del portal
              Object.keys(sessionStorage).filter(k => k.startsWith('portal_token_')).forEach(k => sessionStorage.removeItem(k))
              window.location.reload()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Salir
          </button>
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
                                <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: '1px solid #ede9fe' }}>
                  {r.vet && <span className="text-xs mr-2" style={{ color: '#94a3b8' }}>👨‍⚕️ {r.vet}</span>}
                  {r.weight && <span className="text-xs" style={{ color: '#94a3b8' }}>⚖️ {r.weight} kg</span>}
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
                <p className="text-sm" style={{ color: '#94a3b8' }}>Sin eventos pendientes</p>
              </div>
            ) : upcomingEvents.map(e => (
              <div key={e.id} className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0f172a' }}>
                      {EVENT_LABEL[e.type] ?? e.type}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      📅 {formatDate(e.scheduled_date)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: '#fef9c3', color: '#854d0e' }}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── WhatsApp CTA ── */}
        {whatsappUrl && (
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#166534' }}>
              ¿Necesitas ayuda o quieres agendar?
            </p>
            <div className="flex flex-col gap-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#22c55e' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.112 1.529 5.842L.057 23.714a.5.5 0 00.636.612l5.965-1.837A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.687-.5-5.24-1.373l-.374-.222-3.89 1.198 1.098-3.786-.243-.385A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Consultar por WhatsApp
              </a>
              <a href={`https://wa.me/${clinic.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola! Soy ${data.name ?? data.phone} y quiero agendar una cita para ${pet.name} 📅`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac' }}>
                📅 Agendar cita
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch clinic info for login screen
  useEffect(() => {
    fetch(`/api/portal/clinic/${slug}`)
      .then(r => r.json())
      .then(d => setClinic(d.data ?? d))
      .catch(() => {})
  }, [slug])

  // Check for token in URL or sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('t')
    const storedToken = sessionStorage.getItem(`portal_token_${slug}`)
    const token = urlToken || storedToken

    if (token && token !== 'undefined' && token !== 'null') {
      fetch(`/api/portal/token?t=${token}`)
        .then(r => r.json())
        .then(d => {
          const payload = d.data ?? d
          if (payload?.id) {
            setClientData(payload)
            sessionStorage.setItem(`portal_token_${slug}`, token)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [slug])

  const handleSuccess = (token: string) => {
    sessionStorage.setItem(`portal_token_${slug}`, token)
    fetch(`/api/portal/token?t=${token}`)
      .then(r => r.json())
      .then(d => {
        const payload = d.data ?? d
        if (payload?.id) setClientData(payload)
      })
      .catch(() => {})
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f6ff' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (clientData) return <PassportScreen data={clientData} />
  return <LoginScreen slug={slug} clinic={clinic} onSuccess={handleSuccess} />
}
