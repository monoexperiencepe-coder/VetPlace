'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { createClient } from '@/lib/supabase'

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
  id:             string
  type:           string
  scheduled_date: string
  pet: {
    id:   string
    name: string
    user: { id: string; name?: string; phone: string } | null
  } | null
}

interface TodayBooking {
  id:     string
  time:   string
  status: string
  notes?: string
  pet: {
    id:   string
    name: string
    type: string
    user: { id: string; name?: string; phone: string } | null
  } | null
}

interface StatsData {
  bookings_today:      number
  bookings_yesterday:  number
  bookings_this_week:  number
  bookings_last_week:  number
  bookings_this_month: number
  bookings_last_month: number
  clients_total:       number
  clients_this_month:  number
  clients_last_month:  number
  pets_total:          number
  events_pending:      number
  events_next_7_days:  number
  events_overdue:      number
  next_booking: {
    date:     string
    time:     string
    pet_name: string
  } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const toast = useToast()
  const [stats, setStats]     = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const [overdueEvents, setOverdueEvents]       = useState<OverdueEvent[]>([])
  const [todayBookings, setTodayBookings]       = useState<TodayBooking[]>([])
  const [loadingBookings, setLoadingBookings]   = useState(true)
  const [notifying, setNotifying]               = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    authFetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d.data ?? d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    authFetch('/api/bookings/today')
      .then((r) => r.json())
      .then((d) => { setTodayBookings(d.data ?? []); setLoadingBookings(false) })
      .catch(() => setLoadingBookings(false))
  }, [])

  useEffect(() => {
    authFetch('/api/events/overdue')
      .then((r) => r.json())
      .then((d) => setOverdueEvents(d.data ?? []))
      .catch(() => {})
  }, [])

  const notifyAll = async () => {
    setNotifying(true)
    try {
      await Promise.all(overdueEvents.map((e) =>
        authFetch(`/api/events/${e.id}/notify`, { method: 'POST' })
      ))
      setOverdueEvents([])
      toast.success('✓ Recordatorios enviados')
    } catch {
      toast.error('Error al notificar algunos eventos')
    } finally {
      setNotifying(false)
    }
  }

  const completeBooking = async (id: string) => {
    try {
      await authFetch(`/api/bookings/${id}/complete`, { method: 'PATCH' })
      setTodayBookings((prev) => prev.filter((b) => b.id !== id))
      toast.success('✓ Turno completado')
    } catch {
      toast.error('Error al completar el turno')
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Banner ── */}
      <Link
        href="/bookings"
        className="block relative rounded-2xl overflow-hidden px-8 py-6 cursor-pointer transition-opacity hover:opacity-95"
        style={{ background: 'linear-gradient(135deg, #3b10b5 0%, #601EF9 60%, #7c3aff 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-40 w-20 h-20 rounded-full opacity-10"
          style={{ background: '#fff' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: '#d4b8ff' }}>{greeting} 👋</p>
            <h2 className="text-white text-xl font-bold">Bienvenido a VetPlace</h2>
            <p className="text-sm mt-0.5 capitalize" style={{ color: '#c4b5fd' }}>{today}</p>
          </div>
          <span
            className="hidden md:block px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            Ver agenda →
          </span>
        </div>
      </Link>

      {/* ── Alerta eventos vencidos ── */}
      {overdueEvents.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse" style={{ background: '#ef4444', display: 'inline-block' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#b91c1c' }}>
              {overdueEvents.length} recordatorio{overdueEvents.length > 1 ? 's' : ''} vencido{overdueEvents.length > 1 ? 's' : ''} sin enviar
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#ef4444' }}>
              {overdueEvents.slice(0, 3).map((e) => {
                const days = Math.floor((Date.now() - new Date(e.scheduled_date).getTime()) / 86400000)
                return `${e.pet?.name ?? '?'} (${TYPE_LABEL[e.type] ?? e.type} · ${days}d)`
              }).join(', ')}
              {overdueEvents.length > 3 && ` +${overdueEvents.length - 3} más`}
            </p>
          </div>
          <button
            onClick={notifyAll}
            disabled={notifying}
            className="text-xs font-semibold shrink-0 underline"
            style={{ color: '#dc2626', opacity: notifying ? 0.6 : 1 }}
          >
            {notifying ? 'Enviando…' : 'Notificar todos →'}
          </button>
        </div>
      )}

      {/* ── Fila 1: 4 KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
        ) : (
          <>
            <KpiCard
              icon={<CalIcon />}
              label="Turnos hoy"
              value={stats?.bookings_today ?? null}
              delta={(stats?.bookings_today ?? 0) - (stats?.bookings_yesterday ?? 0)}
              deltaLabel="vs ayer"
              emptyMsg="Sin turnos hoy"
              emptyLink={{ href: '/bookings', text: 'Agendar primero →' }}
            />
            <KpiCard
              icon={<WeekIcon />}
              label="Esta semana"
              value={stats?.bookings_this_week ?? null}
              delta={(stats?.bookings_this_week ?? 0) - (stats?.bookings_last_week ?? 0)}
              deltaLabel="vs semana pasada"
              emptyMsg="Sin turnos esta semana"
            />
            <KpiCard
              icon={<UsersIcon />}
              label="Clientes"
              value={stats?.clients_total ?? null}
              delta={(stats?.clients_this_month ?? 0) - (stats?.clients_last_month ?? 0)}
              deltaLabel="vs mes pasado"
              emptyMsg="Primeros clientes"
              subText={
                (stats?.clients_total ?? 0) >= 5
                  ? `+${stats?.clients_this_month ?? 0} nuevos este mes`
                  : 'Primeros clientes registrados'
              }
            />
            <KpiCard
              icon={<PawIcon />}
              label="Mascotas"
              value={stats?.pets_total ?? null}
              hideDelta
              emptyMsg="Sin mascotas aún"
              subText={stats?.pets_total ? `${stats.pets_total} en el sistema` : undefined}
            />
          </>
        )}
      </div>

      {/* ── Fila 2: Agenda de hoy + Eventos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agenda de hoy */}
        <div className="rounded-2xl p-5 flex flex-col" style={{ background: '#fff', border: '1px solid #ede9fe', minHeight: 180 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Agenda de hoy</p>
            </div>
            {!loadingBookings && todayBookings.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F3EEFF', color: '#601EF9' }}>
                {todayBookings.length} turno{todayBookings.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loadingBookings ? (
            <div className="space-y-3 mt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="h-3.5 rounded" style={{ background: '#f1f5f9', width: '60%' }} />
                  <div className="h-3 rounded"   style={{ background: '#f1f5f9', width: '40%' }} />
                </div>
              ))}
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-6 gap-1">
              <p className="text-sm" style={{ color: '#94a3b8' }}>Sin turnos para hoy</p>
              <Link href="/bookings" className="text-xs font-semibold mt-1" style={{ color: '#601EF9' }}>
                Agendar ahora →
              </Link>
            </div>
          ) : (
            <div className="space-y-0 flex-1 overflow-y-auto" style={{ maxHeight: 220 }}>
              {todayBookings.map((b, i) => (
                <TodayBookingRow
                  key={b.id}
                  booking={b}
                  isLast={i === todayBookings.length - 1}
                  onComplete={completeBooking}
                />
              ))}
            </div>
          )}

          <Link href="/bookings" className="text-xs font-semibold mt-3 self-start" style={{ color: '#601EF9' }}>
            Ver agenda completa →
          </Link>
        </div>

        {/* Eventos pendientes */}
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <p className="text-sm font-semibold" style={{ color: '#64748b' }}>Eventos pendientes</p>
          </div>
          <div className="space-y-2">
            <EventRow label="Pendientes"           value={stats?.events_pending   ?? 0} color="#601EF9" />
            <EventRow label="Próximos 7 días"      value={stats?.events_next_7_days ?? 0} color="#10b981" />
            <EventRow
              label="Vencidos sin notificar"
              value={stats?.events_overdue ?? 0}
              color={(stats?.events_overdue ?? 0) > 0 ? '#ef4444' : '#94a3b8'}
              badge={(stats?.events_overdue ?? 0) > 0}
            />
          </div>
          <Link href="/events" className="text-xs font-semibold self-start mt-auto" style={{ color: '#601EF9' }}>
            Gestionar eventos →
          </Link>
        </div>
      </div>

      {/* ── Fila 3: Herramientas ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
          Herramientas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <InfoCard icon="🎂" title="Próximos cumpleaños" desc="Mascotas con cumpleaños esta semana" badge="Próximamente" badgeColor="#601EF9" accentBg="#F3EEFF">
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Esta función mostrará las mascotas que cumplen años en los próximos 7 días.
            </p>
          </InfoCard>

          <InfoCard icon="📋" title="Historial de clientes" desc={`${stats?.clients_total ?? '—'} clientes registrados`} accentBg="#ecfdf5" href="/clients" linkLabel="Ver clientes →" linkColor="#10b981">
            <div className="mt-3 space-y-1.5">
              <StatRow label="Clientes totales"    value={loading ? '…' : String(stats?.clients_total ?? 0)}    color="#601EF9" />
              <StatRow label="Turnos hoy"           value={loading ? '…' : String(stats?.bookings_today ?? 0)}   color="#10b981" />
              <StatRow label="Eventos pendientes"   value={loading ? '…' : String(stats?.events_pending ?? 0)}  color="#f59e0b" />
            </div>
          </InfoCard>

          <InfoCard icon="🗺️" title="Optimización de ruta" desc="Planificá los turnos a domicilio" badge="Próximamente" badgeColor="#f59e0b" accentBg="#fffbeb">
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Organizá automáticamente los turnos a domicilio por zona geográfica.
            </p>
          </InfoCard>

          <InfoCard icon="💬" title="Recordatorios WhatsApp" desc="Notificaciones automáticas" badge="Próximamente" badgeColor="#25d366" accentBg="#f0fdf4">
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Envío automático de recordatorios de turno y vacunación por WhatsApp.
            </p>
          </InfoCard>

          <InfoCard icon="⚡" title="Accesos rápidos" desc="Navegá las secciones principales" accentBg="#F3EEFF">
            <div className="mt-3 space-y-2">
              <QuickLink href="/clients"  label="Buscar cliente"    emoji="🔍" />
              <QuickLink href="/bookings" label="Agenda del día"    emoji="📅" />
              <QuickLink href="/events"   label="Gestionar eventos" emoji="📋" />
            </div>
          </InfoCard>

          <InfoCard icon="📊" title="Resumen del mes" desc="Comparativa de actividad" accentBg="#F3EEFF">
            <div className="mt-3 space-y-1.5">
              <StatRow label="Turnos este mes"      value={loading ? '…' : String(stats?.bookings_this_month ?? 0)}  color="#601EF9" />
              <StatRow label="Turnos mes pasado"    value={loading ? '…' : String(stats?.bookings_last_month ?? 0)}  color="#94a3b8" />
              <StatRow label="Clientes nuevos"      value={loading ? '…' : String(stats?.clients_this_month ?? 0)}   color="#10b981" />
            </div>
          </InfoCard>
        </div>
      </div>

    </div>
  )
}

// ─── Today Booking Row ────────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  GROOMING: 'baño',
  VACCINE:  'vacuna',
  CHECKUP:  'consulta',
  FOLLOWUP: 'seguimiento',
  OTHER:    'otro',
}

const PET_EMOJI: Record<string, string> = {
  dog:   '🐕',
  cat:   '🐱',
  bird:  '🐦',
  rabbit:'🐇',
  other: '🐾',
}

function TodayBookingRow({
  booking,
  isLast,
  onComplete,
}: {
  booking: TodayBooking
  isLast: boolean
  onComplete: (id: string) => void
}) {
  const [fading, setFading] = useState(false)

  const handleComplete = () => {
    setFading(true)
    setTimeout(() => onComplete(booking.id), 300)
  }

  const petType = (booking.pet?.type ?? 'other').toLowerCase()
  const emoji   = PET_EMOJI[petType] ?? '🐾'

  return (
    <div
      className="py-2.5 transition-opacity duration-300"
      style={{
        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
        opacity: fading ? 0 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-sm font-bold mt-0.5 shrink-0" style={{ color: '#0f172a', minWidth: 42 }}>
            {booking.time}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
              {emoji} {booking.pet?.name ?? '?'} · <span className="font-normal text-xs" style={{ color: '#64748b' }}>{booking.pet?.user?.name ?? ''}</span>
            </p>
            {booking.notes && (
              <p className="text-xs italic truncate" style={{ color: '#94a3b8' }}>{booking.notes}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleComplete}
          className="text-xs font-medium text-white rounded-full px-3 py-1 shrink-0 transition hover:opacity-80"
          style={{ background: '#601EF9' }}
        >
          ✓ Listo
        </button>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: number | null
  delta?: number
  deltaLabel?: string
  hideDelta?: boolean
  emptyMsg?: string
  emptyLink?: { href: string; text: string }
  subText?: string
}

function KpiCard({ icon, label, value, delta, deltaLabel, hideDelta, emptyMsg, emptyLink, subText }: KpiCardProps) {
  const isEmpty = value === null || value === 0

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#F3EEFF' }}
        >
          <span style={{ color: '#601EF9' }}>{icon}</span>
        </div>
        {!hideDelta && delta !== undefined && !isEmpty && (
          <DeltaBadge delta={delta} label={deltaLabel ?? ''} current={value ?? 0} />
        )}
      </div>

      <div>
        <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>
          {value === null ? '—' : value}
        </p>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{label}</p>
      </div>

      {/* Sub-text or empty state */}
      {isEmpty && emptyMsg && (
        <div className="mt-auto">
          <p className="text-xs" style={{ color: '#94a3b8' }}>{emptyMsg}</p>
          {emptyLink && (
            <Link href={emptyLink.href} className="text-xs font-semibold" style={{ color: '#601EF9' }}>
              {emptyLink.text}
            </Link>
          )}
        </div>
      )}
      {!isEmpty && subText && (
        <p className="text-xs" style={{ color: '#94a3b8' }}>{subText}</p>
      )}
    </div>
  )
}

function DeltaBadge({ delta, label, current }: { delta: number; label: string; current: number }) {
  if (delta === 0 && current === 0) {
    return <span className="text-xs" style={{ color: '#94a3b8' }}>Sin actividad aún</span>
  }
  if (delta === 0) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#64748b' }}>
        = igual que antes
      </span>
    )
  }
  const positive = delta > 0
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={
        positive
          ? { background: '#ecfdf5', color: '#059669' }
          : { background: '#fef2f2', color: '#ef4444' }
      }
    >
      {positive ? '↑' : '↓'} {positive ? '+' : ''}{delta} {label}
    </span>
  )
}

// ─── Event row ────────────────────────────────────────────────────────────────
function EventRow({ label, value, color, badge }: { label: string; value: number; color: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: '#64748b' }}>{label}</span>
      <span
        className={`font-bold text-sm ${badge ? 'px-2 py-0.5 rounded-full text-white text-xs' : ''}`}
        style={{ color: badge ? undefined : color, background: badge ? color : undefined }}
      >
        {value}
        {badge && value > 0 ? ' vencidos' : ''}
      </span>
    </div>
  )
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────
function InfoCard({
  icon, title, desc, badge, badgeColor, accentBg, href, linkLabel, linkColor, children,
}: {
  icon: string; title: string; desc: string
  badge?: string; badgeColor?: string; accentBg: string
  href?: string; linkLabel?: string; linkColor?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: accentBg }}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{desc}</p>
          </div>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: accentBg, color: badgeColor }}>
            {badge}
          </span>
        )}
      </div>
      {children}
      {href && linkLabel && (
        <Link href={href} className="mt-4 text-xs font-semibold self-start" style={{ color: linkColor ?? '#601EF9' }}>
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: '#64748b' }}>{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function QuickLink({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-xs font-medium rounded-lg px-2 py-1.5 transition-colors"
      style={{ color: '#334155' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F3EEFF'; e.currentTarget.style.color = '#601EF9' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#334155' }}
    >
      <span>{emoji}</span> {label}
    </Link>
  )
}

function Skeleton({ h = 'h-28' }: { h?: string }) {
  return <div className={`rounded-2xl ${h} animate-pulse`} style={{ background: '#ede9fe' }} />
}

function formatBookingDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function CalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function WeekIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function PawIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="9"  cy="4.5" r="1.5" />
      <circle cx="15" cy="4.5" r="1.5" />
      <circle cx="5"  cy="9"   r="1.5" />
      <circle cx="19" cy="9"   r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10c-3 0-6 2-6 5 0 2 1.5 3.5 3 4h6c1.5-.5 3-2 3-4 0-3-3-5-6-5z" />
    </svg>
  )
}
