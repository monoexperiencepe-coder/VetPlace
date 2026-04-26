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

const metrics = (s: Stats) => [
  {
    label:   'Turnos hoy',
    value:   s.bookings_today,
    icon:    '📅',
    href:    '/bookings',
    color:   'bg-indigo-50 border-indigo-100 text-indigo-700',
    numColor: 'text-indigo-600',
  },
  {
    label:   'Eventos pendientes',
    value:   s.events_pending,
    icon:    '🔔',
    href:    '/events',
    color:   s.events_pending > 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-500',
    numColor: s.events_pending > 0 ? 'text-amber-600' : 'text-gray-400',
  },
  {
    label:   'Eventos próximos 7d',
    value:   s.events_upcoming_7d,
    icon:    '📋',
    href:    '/events',
    color:   'bg-green-50 border-green-100 text-green-700',
    numColor: 'text-green-600',
  },
  {
    label:   'Clientes registrados',
    value:   s.total_clients,
    icon:    '👤',
    href:    '/clients',
    color:   'bg-blue-50 border-blue-100 text-blue-700',
    numColor: 'text-blue-600',
  },
]

const quickLinks = [
  { href: '/bookings', label: 'Ver agenda de hoy', icon: '📅' },
  { href: '/events',   label: 'Gestionar eventos',  icon: '📋' },
  { href: '/clients',  label: 'Buscar cliente',     icon: '🔍' },
]

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    api.getStats()
      .then((d) => setStats(d as Stats))
      .catch(() => setStats({ bookings_today: 0, events_pending: 0, events_upcoming_7d: 0, total_clients: 0 }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
        <p className="text-gray-500 mt-1 capitalize">{today}</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-5 animate-pulse h-24" />
            ))
          : stats && metrics(stats).map((m) => (
              <Link
                key={m.label}
                href={m.href}
                className={`border rounded-xl p-5 hover:shadow-md transition-shadow ${m.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{m.icon}</span>
                </div>
                <p className={`text-3xl font-bold ${m.numColor}`}>{m.value}</p>
                <p className="text-sm mt-1 opacity-80">{m.label}</p>
              </Link>
            ))
        }
      </div>

      {/* Accesos rápidos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Accesos rápidos</h3>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
