'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Stats {
  bookings_today:     number
  events_pending:     number
  events_upcoming_7d: number
  total_clients:      number
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    api.getStats()
      .then((d) => setStats(d as Stats))
      .catch(() => setStats({ bookings_today: 0, events_pending: 0, events_upcoming_7d: 0, total_clients: 0 }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">

      {/* Banner de bienvenida */}
      <div
        className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
        }}
      >
        {/* Círculos decorativos */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-32 w-24 h-24 rounded-full opacity-10"
          style={{ background: '#ffffff' }}
        />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">{greeting} 👋</p>
            <h2 className="text-white text-2xl font-bold">Bienvenido a VetPlace</h2>
            <p className="text-blue-200 text-sm mt-1">
              Gestioná tus clientes, mascotas y recordatorios desde aquí.
            </p>
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

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          loading={loading}
          value={stats?.bookings_today ?? 0}
          label="Turnos hoy"
          sub="pendientes y confirmados"
          href="/bookings"
          icon={<CalIcon />}
          accent="#2563eb"
          accentBg="#eff6ff"
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
        <MetricCard
          loading={loading}
          value={stats?.total_clients ?? 0}
          label="Clientes totales"
          sub="registrados en el sistema"
          href="/clients"
          icon={<UsersIcon />}
          accent="#8b5cf6"
          accentBg="#f5f3ff"
        />
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
          Accesos rápidos
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickCard
            href="/clients"
            icon="🔍"
            title="Buscar cliente"
            desc="Por nombre o teléfono"
            color="#eff6ff"
            border="#bfdbfe"
          />
          <QuickCard
            href="/bookings"
            icon="📅"
            title="Agenda del día"
            desc="Ver y gestionar los turnos"
            color="#ecfdf5"
            border="#a7f3d0"
          />
          <QuickCard
            href="/events"
            icon="📋"
            title="Gestionar eventos"
            desc="Baños, vacunas y controles"
            color="#f5f3ff"
            border="#ddd6fe"
          />
        </div>
      </div>

    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
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
    return (
      <div className="rounded-2xl p-5 h-28 animate-pulse" style={{ background: '#e8eeff' }} />
    )
  }
  return (
    <Link
      href={href}
      className="block rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ background: '#ffffff', border: '1px solid #e4ebff' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: accentBg }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-lg"
          style={{ background: accentBg, color: accent }}
        >
          hoy
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: '#334155' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{sub}</p>
    </Link>
  )
}

function QuickCard({ href, icon, title, desc, color, border }: {
  href: string; icon: string; title: string; desc: string; color: string; border: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ background: color, border: `1px solid ${border}` }}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-sm" style={{ color: '#0f172a' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{desc}</p>
      </div>
      <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function CalIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
