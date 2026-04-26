'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

interface Stats {
  bookings_today:     number
  events_pending:     number
  events_upcoming_7d: number
  total_clients:      number
}

export default function DashboardPage() {
  const toast = useToast()
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    api.getStats()
      .then((d) => setStats(d as Stats))
      .catch(() => {
        setStats({ bookings_today: 0, events_pending: 0, events_upcoming_7d: 0, total_clients: 0 })
        toast.warning('No se pudieron cargar las estadísticas. ¿El servidor está encendido?')
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-7">

      {/* ── Banner ── */}
      <div
        className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{ background: 'linear-gradient(135deg, #3b10b5 0%, #601EF9 60%, #7c3aff 100%)' }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-40 w-20 h-20 rounded-full opacity-10"
          style={{ background: '#ffffff' }}
        />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#d4b8ff' }}>{greeting} 👋</p>
            <h2 className="text-white text-2xl font-bold">Bienvenido a VetPlace</h2>
            <p className="text-sm mt-1 capitalize" style={{ color: '#c4b5fd' }}>{today}</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/bookings"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            >
              Ver agenda →
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3 métricas principales ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          loading={loading}
          value={stats?.bookings_today ?? 0}
          label="Turnos hoy"
          sub="pendientes y confirmados"
          href="/bookings"
          icon={<CalIcon />}
          accent="#601EF9"
          accentBg="#F3EEFF"
        />
        <MetricCard
          loading={loading}
          value={stats?.events_pending ?? 0}
          label="Eventos pendientes"
          sub="sin notificar"
          href="/events"
          icon={<BellIcon />}
          accent={stats && stats.events_pending > 0 ? '#f59e0b' : '#64748b'}
          accentBg={stats && stats.events_pending > 0 ? '#fffbeb' : '#f8fafc'}
        />
        <MetricCard
          loading={loading}
          value={stats?.events_upcoming_7d ?? 0}
          label="Próximos 7 días"
          sub="eventos programados"
          href="/events"
          icon={<ChartIcon />}
          accent="#10b981"
          accentBg="#ecfdf5"
        />
      </div>

      {/* ── Sección inferior: cuadros ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
          Herramientas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Cumpleaños de mascotas */}
          <InfoCard
            icon="🎂"
            title="Próximos cumpleaños"
            desc="Mascotas con cumpleaños esta semana"
            accent="#601EF9"
            accentBg="#F3EEFF"
            badge="Próximamente"
            badgeColor="#601EF9"
          >
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Esta función mostrará las mascotas que cumplen años en los próximos 7 días para que puedas enviarles un saludo.
            </p>
          </InfoCard>

          {/* Historial de clientes */}
          <InfoCard
            icon="📋"
            title="Historial de clientes"
            desc={`${stats?.total_clients ?? '—'} clientes registrados`}
            accent="#10b981"
            accentBg="#ecfdf5"
            href="/clients"
            linkLabel="Ver clientes →"
          >
            <div className="mt-3 space-y-1.5">
              <StatRow label="Clientes totales" value={loading ? '…' : String(stats?.total_clients ?? 0)} color="#601EF9" />
              <StatRow label="Turnos hoy"        value={loading ? '…' : String(stats?.bookings_today ?? 0)} color="#10b981" />
              <StatRow label="Eventos pendientes" value={loading ? '…' : String(stats?.events_pending ?? 0)} color="#f59e0b" />
            </div>
          </InfoCard>

          {/* Optimización de ruta */}
          <InfoCard
            icon="🗺️"
            title="Optimización de ruta"
            desc="Planificá los turnos a domicilio"
            accent="#f59e0b"
            accentBg="#fffbeb"
            badge="Próximamente"
            badgeColor="#f59e0b"
          >
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Organizá automáticamente los turnos a domicilio por zona geográfica para minimizar tiempos de traslado.
            </p>
          </InfoCard>

          {/* Recordatorios WhatsApp */}
          <InfoCard
            icon="💬"
            title="Recordatorios WhatsApp"
            desc="Notificaciones automáticas"
            accent="#25d366"
            accentBg="#f0fdf4"
            badge="Próximamente"
            badgeColor="#25d366"
          >
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Envío automático de recordatorios de turno y vacunación por WhatsApp a los dueños de mascotas.
            </p>
          </InfoCard>

          {/* Accesos rápidos */}
          <InfoCard
            icon="⚡"
            title="Accesos rápidos"
            desc="Navegá las secciones principales"
            accent="#601EF9"
            accentBg="#F3EEFF"
          >
            <div className="mt-3 space-y-2">
              <QuickLink href="/clients"  label="Buscar cliente"    emoji="🔍" />
              <QuickLink href="/bookings" label="Agenda del día"    emoji="📅" />
              <QuickLink href="/events"   label="Gestionar eventos" emoji="📋" />
            </div>
          </InfoCard>

          {/* Resumen del día */}
          <InfoCard
            icon="📊"
            title="Resumen del día"
            desc="Estado actual de la clínica"
            accent="#601EF9"
            accentBg="#F3EEFF"
          >
            <div className="mt-3 space-y-1.5">
              <StatRow
                label="Turnos confirmados"
                value={loading ? '…' : String(stats?.bookings_today ?? 0)}
                color="#601EF9"
              />
              <StatRow
                label="Eventos próx. semana"
                value={loading ? '…' : String(stats?.events_upcoming_7d ?? 0)}
                color="#10b981"
              />
              <StatRow
                label="Alertas pendientes"
                value={loading ? '…' : String(stats?.events_pending ?? 0)}
                color={stats && stats.events_pending > 0 ? '#f59e0b' : '#64748b'}
              />
            </div>
          </InfoCard>

        </div>
      </div>

    </div>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────────────────

interface MetricCardProps {
  loading: boolean
  value: number
  label: string
  sub: string
  href: string
  icon: React.ReactNode
  accent: string
  accentBg: string
}

function MetricCard({ loading, value, label, sub, href, icon, accent, accentBg }: MetricCardProps) {
  if (loading) {
    return <div className="rounded-2xl p-5 h-32 animate-pulse" style={{ background: '#ede9fe' }} />
  }
  return (
    <Link
      href={href}
      className="block rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ background: '#ffffff', border: '1px solid #ede9fe' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accentBg }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-sm font-semibold mt-1" style={{ color: '#334155' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{sub}</p>
    </Link>
  )
}

interface InfoCardProps {
  icon: string
  title: string
  desc: string
  accent: string
  accentBg: string
  badge?: string
  badgeColor?: string
  href?: string
  linkLabel?: string
  children?: React.ReactNode
}

function InfoCard({ icon, title, desc, accent, accentBg, badge, badgeColor, href, linkLabel, children }: InfoCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col"
      style={{ background: '#ffffff', border: '1px solid #ede9fe' }}
    >
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
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ background: accentBg, color: badgeColor ?? accent }}
          >
            {badge}
          </span>
        )}
      </div>

      {children}

      {href && linkLabel && (
        <Link
          href={href}
          className="mt-4 text-xs font-semibold self-start"
          style={{ color: accent }}
        >
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

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

// ─── Icons ────────────────────────────────────────────────────────────────────
function CalIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
