'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'

async function authFetch(path: string, options?: RequestInit) {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers ?? {}) } })
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface OverdueEvent {
  id: string; type: string; scheduled_date: string
  pet: { id: string; name: string; user: { id: string; name?: string; phone: string } | null } | null
}
interface TodayBooking {
  id: string; time: string; status: string; notes?: string
  pet: { id: string; name: string; type: string; user: { id: string; name?: string; phone: string } | null } | null
}
interface StatsData {
  bookings_today: number; bookings_yesterday: number
  bookings_this_week: number; bookings_last_week: number
  bookings_this_month: number; bookings_last_month: number
  clients_total: number; clients_this_month: number; clients_last_month: number
  pets_total: number; events_pending: number; events_next_7_days: number; events_overdue: number
  next_booking: { date: string; time: string; pet_name: string } | null
}
interface Conversation {
  id: string; client_name?: string; phone: string
  bot_active: boolean; unread_count: number; last_message?: string; last_message_at?: string
}

const PET_EMOJI: Record<string, string> = { dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾' }
const EVENT_LABEL: Record<string, string> = { GROOMING: 'Baño', VACCINE: 'Vacuna', CHECKUP: 'Consulta', FOLLOWUP: 'Seguimiento', OTHER: 'Otro' }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const toast = useToast()

  const [stats, setStats]               = useState<StatsData | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [todayBookings, setTodayBookings]     = useState<TodayBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [overdueEvents, setOverdueEvents]     = useState<OverdueEvent[]>([])
  const [conversations, setConversations]     = useState<Conversation[]>([])
  const [notifying, setNotifying]             = useState(false)
  const [clinicAddress, setClinicAddress]     = useState('')
  const [clinicName, setClinicName]           = useState('Mi Clínica')
  const [completingId, setCompletingId]       = useState<string | null>(null)

  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    // Cargar metadata de la clínica
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      if (meta?.clinic_name) setClinicName(meta.clinic_name)
      else {
        const stored = localStorage.getItem('vetplace_clinic_name')
        if (stored) setClinicName(stored)
      }
    })
    api.getMyClinic()
      .then((d: unknown) => {
        const clinic = (d as { ok?: boolean; data?: { address?: string; name?: string } })?.data
        if (clinic?.address) setClinicAddress(clinic.address)
        if (clinic?.name)    setClinicName(clinic.name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    authFetch('/api/stats')
      .then(r => r.json()).then(d => { setStats(d.data ?? d); setLoadingStats(false) })
      .catch(() => setLoadingStats(false))
  }, [])

  useEffect(() => {
    authFetch('/api/bookings/today')
      .then(r => r.json()).then(d => { setTodayBookings(d.data ?? []); setLoadingBookings(false) })
      .catch(() => setLoadingBookings(false))
  }, [])

  useEffect(() => {
    authFetch('/api/events/overdue')
      .then(r => r.json()).then(d => setOverdueEvents(d.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.getConversations()
      .then((d: unknown) => {
        const arr = (d as { ok?: boolean; data?: Conversation[] })?.data ?? (d as Conversation[])
        setConversations(Array.isArray(arr) ? arr.slice(0, 5) : [])
      })
      .catch(() => {})
  }, [])

  const notifyAll = async () => {
    setNotifying(true)
    try {
      await Promise.all(overdueEvents.map(e => authFetch(`/api/events/${e.id}/notify`, { method: 'POST' })))
      setOverdueEvents([])
      toast.success('✓ Recordatorios enviados')
    } catch { toast.error('Error al notificar') }
    finally { setNotifying(false) }
  }

  const completeBooking = async (id: string) => {
    setCompletingId(id)
    try {
      await authFetch(`/api/bookings/${id}/complete`, { method: 'PATCH' })
      setTodayBookings(prev => prev.filter(b => b.id !== id))
      toast.success('✓ Servicio completado')
    } catch { toast.error('Error al completar') }
    finally { setCompletingId(null) }
  }

  const mapsUrl = todayBookings.length
    ? `https://www.google.com/maps/dir/${todayBookings.map(b => b.pet?.user?.phone ?? '').join('/')}`
    : 'https://maps.google.com'

  const occupancy = stats
    ? Math.min(100, Math.round((stats.bookings_today / Math.max(stats.bookings_this_week / 5 || 1, 1)) * 100))
    : 0

  return (
    <div className="space-y-4 pb-8">

      {/* ══════════════════════════════════════════════════════════════
          HEADER INTELIGENTE
      ══════════════════════════════════════════════════════════════ */}
      <Link
        href="/bookings"
        className="block rounded-2xl overflow-hidden px-6 py-5 cursor-pointer transition-opacity hover:opacity-95"
        style={{ background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 60%,#7c3aff 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff 0%,transparent 70%)', position: 'absolute' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#c4b5fd' }}>
                Torre de control · <span className="capitalize">{today}</span>
              </span>
            </div>
            <h1 className="text-white text-xl font-bold mb-1">{clinicName}</h1>
            {clinicAddress ? (
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#a78bfa', fontSize: 13 }}>📍</span>
                <span className="text-sm" style={{ color: '#c4b5fd' }}>{clinicAddress}</span>
              </div>
            ) : (
              <Link href="/settings" className="text-xs underline" style={{ color: '#a78bfa' }}
                onClick={e => e.stopPropagation()}>
                + Agregar dirección de la clínica
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Pill icon="🛵" label="Servicios hoy" value={loadingStats ? '…' : String(stats?.bookings_today ?? 0)} />
            <Pill icon="⚠️" label="Vencidos" value={String(overdueEvents.length)} alert={overdueEvents.length > 0} />
            <span className="hidden sm:block px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.18)' }}>
              Ver agenda →
            </span>
          </div>
        </div>
      </Link>

      {/* ══════════════════════════════════════════════════════════════
          LAYOUT PRINCIPAL
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Columna izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* RUTAS DEL DÍA */}
          <Section>
            <SectionHeader
              icon="🛵"
              title="Rutas del día"
              badge={todayBookings.length > 0 ? `${todayBookings.length} paradas` : undefined}
              action={
                todayBookings.length > 0 ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                    style={{ background: '#F3EEFF', color: '#601EF9' }}
                  >
                    <span>🗺️</span> Google Maps
                  </a>
                ) : null
              }
            />

            {/* Mapa visual de ruta */}
            {loadingBookings ? (
              <div className="h-32 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
            ) : todayBookings.length === 0 ? (
              <EmptyRoute />
            ) : (
              <>
                <RouteMap bookings={todayBookings} clinicName={clinicName} />

                {/* Lista de paradas */}
                <div className="mt-3 space-y-0">
                  {/* Origen */}
                  <RouteStop
                    index={0}
                    isClinic
                    label={clinicName || 'Clínica (origen)'}
                    sub="Punto de inicio"
                    isFirst
                  />
                  {todayBookings.map((b, i) => (
                    <RouteStop
                      key={b.id}
                      index={i + 1}
                      label={`${b.pet?.name ?? '?'} · ${b.pet?.user?.name ?? b.pet?.user?.phone ?? '?'}`}
                      sub={`${b.time} · ${EVENT_LABEL[b.notes ?? ''] ?? b.notes ?? 'Servicio'}`}
                      emoji={PET_EMOJI[b.pet?.type ?? 'other']}
                      onComplete={() => completeBooking(b.id)}
                      completing={completingId === b.id}
                      isLast={i === todayBookings.length - 1}
                    />
                  ))}
                  {/* Retorno */}
                  <RouteStop
                    index={todayBookings.length + 1}
                    isClinic
                    label={clinicName || 'Clínica (retorno)'}
                    sub="Punto de llegada"
                    isReturn
                  />
                </div>

                {/* Métricas de ruta */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <RouteStat label="Paradas" value={String(todayBookings.length)} icon="📍" />
                  <RouteStat label="Est. duración" value={`~${todayBookings.length * 35}m`} icon="⏱️" />
                  <RouteStat label="Eficiencia" value={todayBookings.length >= 3 ? 'Alta' : 'Normal'} icon="⚡" color={todayBookings.length >= 3 ? '#10b981' : '#f59e0b'} />
                </div>

                {/* Acciones de ruta */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <RouteAction icon="🔄" label="Recalcular" onClick={() => toast.success('Ruta recalculada')} />
                  <RouteAction
                    icon="💬"
                    label="Enviar por WhatsApp"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `📍 Ruta de hoy (${todayStr}):\n` +
                        todayBookings.map((b, i) => `${i + 1}. ${b.time} · ${b.pet?.name} · ${b.pet?.user?.name ?? b.pet?.user?.phone}`).join('\n')
                      )
                      window.open(`https://wa.me/?text=${text}`, '_blank')
                    }}
                  />
                  <Link href="/bookings">
                    <RouteAction icon="📅" label="Ver agenda completa" onClick={() => {}} />
                  </Link>
                </div>
              </>
            )}
          </Section>

          {/* OPORTUNIDADES */}
          <Section>
            <SectionHeader
              icon="🎯"
              title="Oportunidades"
              badge={overdueEvents.length > 0 ? `${overdueEvents.length} sin notificar` : undefined}
              badgeColor="#ef4444"
              action={
                overdueEvents.length > 0 ? (
                  <button
                    onClick={notifyAll}
                    disabled={notifying}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: '#fef2f2', color: '#dc2626' }}
                  >
                    {notifying ? 'Enviando…' : '📨 Notificar todos'}
                  </button>
                ) : null
              }
            />

            {overdueEvents.length === 0 ? (
              <div className="flex items-center gap-3 py-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Todo al día</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>No hay eventos vencidos pendientes de notificación.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueEvents.slice(0, 5).map(e => {
                  const days = Math.floor((Date.now() - new Date(e.scheduled_date).getTime()) / 86400000)
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: '#ef4444' }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                            {e.pet?.name ?? '?'} · <span className="font-normal">{e.pet?.user?.name ?? e.pet?.user?.phone ?? '?'}</span>
                          </p>
                          <p className="text-xs" style={{ color: '#ef4444' }}>
                            {EVENT_LABEL[e.type] ?? e.type} · vencido hace {days}d
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          await authFetch(`/api/events/${e.id}/notify`, { method: 'POST' })
                          setOverdueEvents(prev => prev.filter(x => x.id !== e.id))
                          toast.success('Recordatorio enviado')
                        }}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
                        style={{ background: '#dc2626', color: '#fff' }}
                      >
                        Notificar
                      </button>
                    </div>
                  )
                })}
                {overdueEvents.length > 5 && (
                  <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
                    +{overdueEvents.length - 5} más — <button onClick={notifyAll} className="underline font-semibold" style={{ color: '#601EF9' }}>Notificar todos</button>
                  </p>
                )}
              </div>
            )}

            {/* Siguiente evento */}
            {stats?.events_next_7_days !== undefined && stats.events_next_7_days > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>{stats.events_next_7_days} eventos próximos 7 días</p>
                    <p className="text-[11px]" style={{ color: '#94a3b8' }}>{stats.events_pending} pendientes en total</p>
                  </div>
                </div>
                <Link href="/events" className="text-xs font-semibold" style={{ color: '#601EF9' }}>Ver todos →</Link>
              </div>
            )}
          </Section>
        </div>

        {/* ── Columna derecha (1/3) ── */}
        <div className="space-y-4">

          {/* CONVERSACIONES */}
          <Section>
            <SectionHeader
              icon="💬"
              title="Conversaciones"
              action={<Link href="/chats" className="text-xs font-semibold" style={{ color: '#601EF9' }}>Ver todas →</Link>}
            />

            {conversations.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <span className="text-3xl">💬</span>
                <p className="text-xs text-center" style={{ color: '#94a3b8' }}>Sin conversaciones activas</p>
                <Link href="/chats" className="text-xs font-semibold" style={{ color: '#601EF9' }}>Abrir chats →</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map(c => (
                  <Link key={c.id} href="/chats"
                    className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl transition-colors"
                    onMouseEnter={e => e.currentTarget.style.background = '#F3EEFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                      {(c.client_name ?? c.phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
                          {c.client_name ?? c.phone}
                        </p>
                        {c.unread_count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                            style={{ background: '#601EF9' }}>
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                        {c.bot_active ? '🤖 Bot activo · ' : ''}{c.last_message ?? 'Sin mensajes'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {/* ACCIONES RÁPIDAS */}
          <Section>
            <SectionHeader icon="⚡" title="Acciones rápidas" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📅', label: 'Nueva cita',    href: '/bookings?new=1' },
                { icon: '👤', label: 'Nuevo cliente', href: '/clients' },
                { icon: '🐾', label: 'Nueva mascota', href: '/clients' },
                { icon: '📋', label: 'Nuevo evento',  href: '/events' },
              ].map(a => (
                <Link key={a.label} href={a.href}
                  className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl text-center transition-all hover:-translate-y-0.5"
                  style={{ background: '#F9F9FB', border: '1.5px solid #ede9fe' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F3EEFF'; e.currentTarget.style.borderColor = '#c4b5fd' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F9F9FB'; e.currentTarget.style.borderColor = '#ede9fe' }}
                >
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-[11px] font-semibold" style={{ color: '#334155' }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </Section>

          {/* MINI MÉTRICAS */}
          <Section>
            <SectionHeader icon="📊" title="Métricas del día" />
            <div className="space-y-3">
              <MetricRow
                label="Servicios realizados"
                value={loadingStats ? '…' : `${stats?.bookings_today ?? 0}`}
                sub={`de ${Math.max(stats?.bookings_today ?? 0, 6)} posibles`}
                percent={occupancy}
                color="#601EF9"
              />
              <MetricRow
                label="Esta semana"
                value={loadingStats ? '…' : `${stats?.bookings_this_week ?? 0}`}
                sub={`vs ${stats?.bookings_last_week ?? 0} sem. ant.`}
                percent={Math.min(100, ((stats?.bookings_this_week ?? 0) / Math.max(stats?.bookings_last_week ?? 1, 1)) * 100)}
                color="#10b981"
              />
              <MetricRow
                label="Clientes totales"
                value={loadingStats ? '…' : `${stats?.clients_total ?? 0}`}
                sub={`+${stats?.clients_this_month ?? 0} este mes`}
                percent={Math.min(100, ((stats?.clients_this_month ?? 0) / Math.max(stats?.clients_total ?? 1, 1)) * 100)}
                color="#f59e0b"
              />
            </div>
          </Section>

        </div>
      </div>

    </div>
  )
}

// ─── Componente: Mapa visual de ruta ──────────────────────────────────────────
function RouteMap({ bookings, clinicName }: { bookings: TodayBooking[]; clinicName: string }) {
  const stops = bookings.length
  const width  = 100
  const pad    = 12
  const step   = stops > 0 ? (width - pad * 2) / (stops + 1) : 0

  const points = [
    { x: pad, label: '🏥', isClinic: true },
    ...bookings.map((b, i) => ({ x: pad + step * (i + 1), label: PET_EMOJI[b.pet?.type ?? 'other'], time: b.time, name: b.pet?.name ?? '?', isClinic: false })),
    { x: width - pad, label: '🏥', isClinic: true },
  ]

  return (
    <div className="relative rounded-2xl overflow-hidden p-4" style={{ background: 'linear-gradient(135deg,#F3EEFF 0%,#ede9fe 100%)', border: '1px solid #ddd6fe' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#7c3aed' }}>Ruta del día</span>
        <span className="text-[11px]" style={{ color: '#94a3b8' }}>{bookings.length} paradas</span>
      </div>

      {/* SVG route line */}
      <svg viewBox={`0 0 ${width} 24`} className="w-full" style={{ height: 56, overflow: 'visible' }}>
        {/* Línea de ruta */}
        <path
          d={`M ${points[0].x} 12 ${points.slice(1).map(p => `L ${p.x} 12`).join(' ')}`}
          fill="none" stroke="#601EF9" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"
        />
        {/* Puntos */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={12} r={p.isClinic ? 5 : 4}
              fill={p.isClinic ? '#601EF9' : '#fff'}
              stroke="#601EF9" strokeWidth="1.5"
            />
            {!p.isClinic && (
              <text x={p.x} y={14} textAnchor="middle" fontSize="5" fill="#601EF9" fontWeight="bold">
                {i}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-semibold" style={{ color: '#601EF9' }}>🏥 {clinicName || 'Clínica'}</span>
        {bookings.length > 0 && bookings.map((b, i) => (
          <span key={i} className="text-[10px] font-medium" style={{ color: '#7c3aed' }}>
            {i + 1}. {b.time}
          </span>
        ))}
        <span className="text-[10px] font-semibold" style={{ color: '#601EF9' }}>🏥 Retorno</span>
      </div>
    </div>
  )
}

function EmptyRoute() {
  return (
    <div className="flex flex-col items-center py-8 gap-3 rounded-2xl" style={{ background: '#F9F9FB', border: '1.5px dashed #ddd6fe' }}>
      <span className="text-4xl">🛵</span>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Sin servicios programados hoy</p>
        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Agendá citas para ver las rutas del día</p>
      </div>
      <Link href="/bookings?new=1"
        className="px-4 py-2 rounded-xl text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
        + Agendar ahora
      </Link>
    </div>
  )
}

// ─── Componente: Parada de ruta ───────────────────────────────────────────────
function RouteStop({
  index, isClinic, label, sub, emoji, isFirst, isLast, isReturn, onComplete, completing,
}: {
  index: number; isClinic?: boolean; label: string; sub: string
  emoji?: string; isFirst?: boolean; isLast?: boolean; isReturn?: boolean
  onComplete?: () => void; completing?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Línea vertical */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10"
          style={isClinic
            ? { background: '#601EF9', color: '#fff' }
            : { background: '#F3EEFF', color: '#601EF9', border: '2px solid #ddd6fe' }}
        >
          {isClinic ? '🏥' : index}
        </div>
        {!isLast && !isReturn && (
          <div className="w-0.5 h-8 mt-0.5" style={{ background: '#ddd6fe' }} />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: isClinic ? '#601EF9' : '#0f172a' }}>
              {emoji && <span className="mr-1">{emoji}</span>}{label}
            </p>
            <p className="text-[11px]" style={{ color: '#94a3b8' }}>{sub}</p>
          </div>
          {onComplete && !isClinic && (
            <button
              onClick={onComplete}
              disabled={completing}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white shrink-0 disabled:opacity-50"
              style={{ background: '#601EF9' }}
            >
              {completing ? '…' : '✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Pequeños componentes ──────────────────────────────────────────────────────
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, badge, badgeColor, action }: {
  icon: string; title: string; badge?: string; badgeColor?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{title}</span>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: badgeColor ? '#fef2f2' : '#F3EEFF', color: badgeColor ?? '#601EF9' }}>
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

function Pill({ icon, label, value, alert }: { icon: string; label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: alert && Number(value) > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.13)' }}>
      <span>{icon}</span>
      <div>
        <p className="text-[10px] font-medium" style={{ color: '#c4b5fd' }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: alert && Number(value) > 0 ? '#fca5a5' : '#fff' }}>{value}</p>
      </div>
    </div>
  )
}

function RouteStat({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl" style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-bold" style={{ color: color ?? '#0f172a' }}>{value}</span>
      <span className="text-[10px] font-medium text-center" style={{ color: '#94a3b8' }}>{label}</span>
    </div>
  )
}

function RouteAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
      style={{ background: '#F3EEFF', color: '#601EF9' }}
      onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
      onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}
    >
      <span>{icon}</span> {label}
    </button>
  )
}

function MetricRow({ label, value, sub, percent, color }: {
  label: string; value: string; sub: string; percent: number; color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: '#334155' }}>{label}</span>
        <div className="text-right">
          <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{value}</span>
          <span className="text-[10px] ml-1.5" style={{ color: '#94a3b8' }}>{sub}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(4, percent)}%`, background: color }}
        />
      </div>
    </div>
  )
}
