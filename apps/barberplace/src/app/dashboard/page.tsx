'use client'
import { useState } from 'react'

// ─── Demo data ─────────────────────────────────────────────────────────────
const DEMO_APPOINTMENTS = [
  { id: '1', time: '09:00', client: 'Rodrigo Lima',   service: 'Corte + Barba',  barber: 'Miguel',  status: 'completed', price: 45 },
  { id: '2', time: '10:00', client: 'Felipe Torres',  service: 'Corte degradado', barber: 'Carlos', status: 'completed', price: 35 },
  { id: '3', time: '11:30', client: 'Sebastián Cruz', service: 'Diseño de barba', barber: 'Miguel', status: 'confirmed', price: 30 },
  { id: '4', time: '12:30', client: 'Diego Ríos',     service: 'Corte + Tinte',  barber: 'Luis',    status: 'confirmed', price: 60 },
  { id: '5', time: '14:00', client: 'Martín Vera',    service: 'Corte clásico',  barber: 'Carlos',  status: 'pending',   price: 30 },
  { id: '6', time: '15:30', client: 'Andrés Ponce',   service: 'Afeitado navalha', barber: 'Miguel', status: 'pending',  price: 25 },
]

const BARBERS = ['Miguel', 'Carlos', 'Luis']

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending:   'bg-yellow-100 text-yellow-700',
}
const STATUS_LABEL: Record<string, string> = {
  completed: '✓ Listo',
  confirmed: '● Confirmado',
  pending:   '○ Pendiente',
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [filter, setFilter] = useState<string>('Todos')

  const shown = filter === 'Todos'
    ? DEMO_APPOINTMENTS
    : DEMO_APPOINTMENTS.filter(a => a.barber === filter)

  const revenue     = shown.filter(a => a.status === 'completed').reduce((s, a) => s + a.price, 0)
  const completed   = shown.filter(a => a.status === 'completed').length
  const pending     = shown.filter(a => a.status !== 'completed').length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Martes, 26 de mayo 2026</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors">
          + Nueva cita
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ingresos hoy',   value: `S/ ${revenue}`, icon: '💰', color: 'bg-green-50 text-green-700' },
          { label: 'Atendidos',      value: completed,        icon: '✂️', color: 'bg-blue-50 text-blue-700'  },
          { label: 'Por atender',    value: pending,          icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Appointments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Citas de hoy</h2>
          <div className="flex gap-2">
            {['Todos', ...BARBERS].map(b => (
              <button
                key={b}
                onClick={() => setFilter(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === b
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="divide-y divide-gray-50">
          {shown.map(apt => (
            <div key={apt.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <span className="w-14 text-sm font-mono font-medium text-gray-600">{apt.time}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{apt.client}</p>
                <p className="text-xs text-gray-500 mt-0.5">{apt.service} · {apt.barber}</p>
              </div>
              <span className="text-sm font-semibold text-gray-700">S/ {apt.price}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[apt.status]}`}>
                {STATUS_LABEL[apt.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
