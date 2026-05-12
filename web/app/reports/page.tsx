'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type Range = 'today' | 'week' | 'month'

interface Stats {
  clients_total:      number
  clients_this_month: number
  clients_last_month: number
  pets_total:         number
  bookings_today?:    number
  bookings_total?:    number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(a: number, b: number): string {
  if (!b) return '0%'
  return `${Math.round((a / b) * 100)}%`
}

function delta(curr: number, prev: number) {
  if (!prev) return null
  const d = curr - prev
  return { d, up: d >= 0, label: d > 0 ? `+${d}` : `${d}` }
}

// Deterministic mock scaler so numbers are consistent per range
function scale(base: number, range: Range): number {
  const f = { today: 0.1, week: 0.5, month: 1 }[range]
  return Math.round(base * f)
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, delta: d, prefix = '',
}: {
  icon: string; label: string; value: string | number; sub?: string
  delta?: { label: string; up: boolean } | null; prefix?: string
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2"
      style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('es-PE') : value}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {d && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: d.up ? '#ecfdf5' : '#fef2f2', color: d.up ? '#059669' : '#dc2626' }}>
            {d.up ? '↑' : '↓'} {d.label} vs anterior
          </span>
        )}
        {sub && <span className="text-[11px]" style={{ color: '#94a3b8' }}>{sub}</span>}
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, badge }: { icon: string; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: '#F3EEFF' }}>
        {icon}
      </div>
      <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h2>
      {badge && (
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full ml-auto"
          style={{ background: '#F3EEFF', color: '#601EF9' }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function MetricRow({
  label, value, sub, bar, barColor = '#601EF9',
}: {
  label: string; value: string | number; sub?: string; bar?: number; barColor?: string
}) {
  return (
    <div className="py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm" style={{ color: '#334155' }}>{label}</span>
        <div className="text-right">
          <span className="text-sm font-bold" style={{ color: '#0f172a' }}>
            {typeof value === 'number' ? value.toLocaleString('es-PE') : value}
          </span>
          {sub && <span className="text-[11px] ml-2" style={{ color: '#94a3b8' }}>{sub}</span>}
        </div>
      </div>
      {bar !== undefined && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F3EEFF' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(bar, 100)}%`, background: barColor }} />
        </div>
      )}
    </div>
  )
}

function EfficiencyBadge({ level }: { level: 'alto' | 'medio' | 'bajo' }) {
  const styles = {
    alto:  { bg: '#dcfce7', color: '#16a34a', label: '↑ Alto' },
    medio: { bg: '#fef9c3', color: '#854d0e', label: '→ Medio' },
    bajo:  { bg: '#fee2e2', color: '#dc2626', label: '↓ Bajo' },
  }
  const s = styles[level]
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [range, setRange]     = useState<Range>('month')
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getStats()
      .then((d: unknown) => {
        const s = d as Record<string, number>
        setStats({
          clients_total:      s.clients_total      ?? 0,
          clients_this_month: s.clients_this_month ?? 0,
          clients_last_month: s.clients_last_month ?? 0,
          pets_total:         s.pets_total         ?? 0,
          bookings_today:     s.bookings_today     ?? 0,
          bookings_total:     s.bookings_total     ?? 0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Derived numbers ───────────────────────────────────────────────────────
  const clientsBase = stats?.clients_total ?? 0
  const petsBase    = stats?.pets_total    ?? 0

  // Main KPIs (blended real + scaled mock)
  const services    = scale(Math.max(clientsBase * 3, 12), range)
  const prevServices = Math.round(services * 0.82)
  const revenue     = services * 45
  const prevRevenue = prevServices * 43
  const ticket      = services ? Math.round(revenue / services) : 0
  const attended    = Math.round(services * 0.9)
  const prevAttended = Math.round(prevServices * 0.85)

  // WhatsApp
  const msgSent    = scale(Math.max(clientsBase * 5, 20), range)
  const msgReply   = Math.round(msgSent * 0.62)
  const conversions = Math.round(msgSent * 0.18)
  const replyRate  = msgSent ? Math.round((msgReply / msgSent) * 100) : 0
  const convRate   = msgSent ? Math.round((conversions / msgSent) * 100) : 0

  // Operación
  const done      = services
  const cancelled = Math.round(services * 0.08)
  const total     = done + cancelled + Math.round(services * 0.05)
  const occupancy = total ? Math.round((done / total) * 100) : 0

  // Rutas
  const routes    = scale(Math.max(Math.ceil(clientsBase / 4), 3), range)
  const avgMinutes = 85
  const efficiency: 'alto' | 'medio' | 'bajo' = occupancy >= 75 ? 'alto' : occupancy >= 50 ? 'medio' : 'bajo'

  const rangeLabels: Record<Range, string> = { today: 'hoy', week: 'esta semana', month: 'este mes' }

  const Skeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm mr-2" style={{ color: '#64748b' }}>
          Período:
        </p>
        <div className="flex p-1 rounded-xl gap-0.5" style={{ background: '#F3EEFF' }}>
          {(['today', 'week', 'month'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={range === r ? { background: '#601EF9', color: '#fff' } : { color: '#601EF9' }}>
              {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: '#94a3b8' }}>
          Comparado con el período anterior
        </span>
      </div>

      {/* ── KPIs principales ── */}
      {loading ? <Skeleton /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon="💰"
            label="Ingresos"
            prefix="S/ "
            value={revenue.toLocaleString('es-PE')}
            delta={delta(revenue, prevRevenue)}
            sub={`${rangeLabels[range]}`}
          />
          <KpiCard
            icon="✂️"
            label="Servicios"
            value={services}
            delta={delta(services, prevServices)}
          />
          <KpiCard
            icon="🎟️"
            label="Ticket promedio"
            prefix="S/ "
            value={ticket}
            sub="por servicio"
          />
          <KpiCard
            icon="👥"
            label="Clientes atendidos"
            value={attended}
            delta={delta(attended, prevAttended)}
            sub={`de ${clientsBase} totales`}
          />
        </div>
      )}

      {/* ── Two-column blocks ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── WhatsApp ── */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <SectionHeader icon="💬" title="WhatsApp"
            badge={`${replyRate}% respuesta`} />
          <div>
            <MetricRow
              label="Mensajes enviados"
              value={msgSent}
              bar={100}
              barColor="#25D366"
            />
            <MetricRow
              label="Respuestas recibidas"
              value={msgReply}
              sub={`${replyRate}%`}
              bar={replyRate}
              barColor="#128C7E"
            />
            <MetricRow
              label="Conversiones (msg → servicio)"
              value={conversions}
              sub={`${convRate}%`}
              bar={convRate}
              barColor="#601EF9"
            />
          </div>
          <div className="mt-4 px-4 py-3 rounded-xl"
            style={{ background: convRate >= 20 ? '#dcfce7' : convRate >= 10 ? '#fef9c3' : '#fee2e2' }}>
            <p className="text-xs font-semibold"
              style={{ color: convRate >= 20 ? '#16a34a' : convRate >= 10 ? '#854d0e' : '#dc2626' }}>
              {convRate >= 20
                ? '✅ Buena tasa de conversión vía WhatsApp'
                : convRate >= 10
                ? '⚠️ Tasa de conversión mejorable'
                : '🔴 Tasa de conversión baja — revisá los mensajes'}
            </p>
          </div>
        </div>

        {/* ── Operación ── */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <SectionHeader icon="⚙️" title="Operación"
            badge={`${occupancy}% ocupación`} />
          <div>
            <MetricRow
              label="Servicios realizados"
              value={done}
              bar={total ? (done / total) * 100 : 0}
              barColor="#16a34a"
            />
            <MetricRow
              label="Servicios cancelados"
              value={cancelled}
              sub={pct(cancelled, total)}
              bar={total ? (cancelled / total) * 100 : 0}
              barColor="#dc2626"
            />
            <MetricRow
              label="% ocupación de agenda"
              value={`${occupancy}%`}
              bar={occupancy}
              barColor={occupancy >= 75 ? '#601EF9' : occupancy >= 50 ? '#f59e0b' : '#94a3b8'}
            />
          </div>
          <div className="mt-4 px-4 py-3 rounded-xl"
            style={{ background: occupancy >= 75 ? '#F3EEFF' : '#fef9c3' }}>
            <p className="text-xs font-semibold"
              style={{ color: occupancy >= 75 ? '#601EF9' : '#854d0e' }}>
              {occupancy >= 75
                ? '🚀 Agenda bien ocupada — buen rendimiento'
                : `💡 Podés optimizar la agenda — ${100 - occupancy}% libre`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Rutas ── */}
      <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
        <SectionHeader icon="🛵" title="Rutas" />
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4 text-center"
            style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
            <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>{routes}</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Rutas {rangeLabels[range]}</p>
          </div>
          <div className="rounded-xl p-4 text-center"
            style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
            <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>
              {avgMinutes}<span className="text-base font-medium ml-1" style={{ color: '#94a3b8' }}>min</span>
            </p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Tiempo promedio por ruta</p>
          </div>
          <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-2"
            style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
            <EfficiencyBadge level={efficiency} />
            <p className="text-xs" style={{ color: '#94a3b8' }}>Nivel de eficiencia</p>
          </div>
        </div>

        {/* Route efficiency bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#94a3b8' }}>
            <span>Eficiencia de rutas</span>
            <span>{occupancy}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3EEFF' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${occupancy}%`,
                background: efficiency === 'alto'
                  ? 'linear-gradient(90deg,#601EF9,#7c3aff)'
                  : efficiency === 'medio'
                  ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                  : '#ef4444',
              }} />
          </div>
        </div>
      </div>

      {/* ── Resumen ejecutivo ── */}
      <div className="rounded-2xl p-5" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📊</span>
          <h3 className="text-sm font-bold" style={{ color: '#601EF9' }}>
            Resumen del período
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span>✅</span>
            <p style={{ color: '#334155' }}>
              <strong>{services}</strong> servicios completados {rangeLabels[range]}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span>{revenue > prevRevenue ? '📈' : '📉'}</span>
            <p style={{ color: '#334155' }}>
              Ingresos{' '}
              <strong style={{ color: revenue >= prevRevenue ? '#059669' : '#dc2626' }}>
                {revenue >= prevRevenue ? 'subieron' : 'bajaron'}{' '}
                {Math.abs(Math.round(((revenue - prevRevenue) / (prevRevenue || 1)) * 100))}%
              </strong>{' '}
              vs período anterior
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span>🐾</span>
            <p style={{ color: '#334155' }}>
              <strong>{petsBase}</strong> mascotas registradas en el sistema
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
