'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { createClient } from '@/lib/supabase'
import { api, type FinanceSummary } from '@/lib/api'
import { useRole } from '@/hooks/useRole'

// ─── Types ─────────────────────────────────────────────────────────────────
interface TodayBooking {
  id: string; time: string; status: string; notes?: string; price?: number
  pet: { id: string; name: string; type: string; user: { id: string; name?: string; phone: string } | null } | null
}
interface StatsData {
  bookings_today: number
  bookings_this_month: number; bookings_last_month: number
  clients_total: number; clients_this_month: number
  events_overdue: number; events_next_7_days: number
}
interface OverdueEvent {
  id: string; type: string; scheduled_date: string
  pet: { id: string; name: string; user: { id: string; name?: string; phone: string } | null } | null
}

const PET_EMOJI: Record<string, string> = { dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾' }
const EVENT_LABEL: Record<string, string> = { vaccine: 'Vacuna', grooming: 'Baño', checkup: 'Consulta', deworming: 'Desparasitación' }
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmada' },
  PENDING:   { bg: '#fffbeb', color: '#d97706', label: 'Pendiente'  },
  COMPLETED: { bg: '#f1f5f9', color: '#64748b', label: 'Completada' },
  CANCELLED: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelada'  },
}

const DEMO_FINANCE: FinanceSummary = {
  revenueThisMonth: 4850, revenueLastMonth: 4200, revenueGrowth: 15,
  avgTicket: 68, pendingCount: 3,
  monthlyRevenue: [], topServices: [], topClients: [],
  inactiveClients: [
    { id: 'i1', name: 'Pedro Ríos',   phone: '+51987654321', days_inactive: 78 },
    { id: 'i2', name: 'Lucía Vargas', phone: '+51976543210', days_inactive: 91 },
  ],
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fmt(n: number) { return n.toLocaleString('es-PE') }

// ══════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const toast                         = useToast()
  const { role, isOwner }              = useRole()
  const [stats, setStats]             = useState<StatsData | null>(null)
  const [finance, setFinance]         = useState<FinanceSummary>(DEMO_FINANCE)
  const [todayBookings, setTB]        = useState<TodayBooking[]>([])
  const [overdueEvents, setOverdue]   = useState<OverdueEvent[]>([])
  const [clinicName, setClinicName]   = useState('Mi Clínica')
  const [completingId, setCI]         = useState<string | null>(null)
  const [loadingTB, setLoadingTB]     = useState(true)
  const [notifying, setNotifying]     = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      if (meta?.clinic_name) setClinicName(meta.clinic_name)
    })
    api.getMyClinic().then((d: unknown) => {
      const c = (d as { data?: { name?: string } })?.data
      if (c?.name) setClinicName(c.name)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.getStats().then(d => setStats(d as StatsData)).catch(() => {})
  }, [])

  useEffect(() => {
    api.getFinanceSummary().then(d => { if (d) setFinance(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    api.getTodayBookings()
      .then(d => { setTB(d as TodayBooking[]); setLoadingTB(false) })
      .catch(() => setLoadingTB(false))
  }, [])

  useEffect(() => {
    api.getOverdueEvents().then(d => setOverdue(d as OverdueEvent[])).catch(() => {})
  }, [])

  const completeBooking = async (id: string) => {
    setCI(id)
    try {
      await api.completeBooking(id)
      setTB(prev => prev.filter(b => b.id !== id))
      toast.success('✓ Servicio completado')
    } catch { toast.error('Error al completar') }
    finally { setCI(null) }
  }

  const S = (k: string) => STATUS_STYLE[k] ?? STATUS_STYLE.PENDING
  const gr = finance.revenueGrowth
  const totalAlerts = overdueEvents.length + finance.inactiveClients.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>

      {/* ══ HERO — owner / loading / staff ═════════════════════════════════ */}
      {(isOwner || role === 'loading') && <div style={{
        borderRadius: 20, padding: '22px 28px',
        background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 55%,#7c3aff 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <p style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.05em' }}>
            {getGreeting()} · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>{clinicName}</h1>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 600, margin: '0 0 3px', letterSpacing: '0.06em' }}>INGRESOS ESTE MES</p>
              <p style={{ color: '#fff', fontSize: 38, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                S/ {fmt(finance.revenueThisMonth)}
              </p>
            </div>
            {gr !== null && (
              <div style={{
                padding: '7px 13px', borderRadius: 12, marginBottom: 4,
                background: gr >= 0 ? 'rgba(134,239,172,0.18)' : 'rgba(252,165,165,0.18)',
              }}>
                <p style={{ color: gr >= 0 ? '#86efac' : '#fca5a5', fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {gr >= 0 ? '+' : ''}{gr}%
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '2px 0 0' }}>vs mes anterior</p>
              </div>
            )}
          </div>
        </div>
        <Link href="/finances" style={{
          padding: '10px 20px', borderRadius: 12, background: '#fff',
          color: '#601EF9', fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}>
          Ver finanzas →
        </Link>
      </div>}

      {/* ══ Staff greeting — same visual weight as owner hero ══════════════ */}
      {role === 'staff' && (
        <div style={{
          borderRadius: 20, padding: '22px 28px',
          background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 55%,#7c3aff 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.05em' }}>
              {getGreeting()} · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{clinicName}</h1>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <p style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 600, margin: '0 0 2px', letterSpacing: '0.06em' }}>CITAS HOY</p>
                <p style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {stats?.bookings_today ?? (loadingTB ? '…' : todayBookings.length)}
                </p>
              </div>
              <div>
                <p style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 600, margin: '0 0 2px', letterSpacing: '0.06em' }}>PENDIENTES</p>
                <p style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {todayBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>
          <Link href="/bookings?new=1" style={{
            padding: '10px 20px', borderRadius: 12, background: '#fff',
            color: '#601EF9', fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Nueva cita →
          </Link>
        </div>
      )}

      {/* ══ 3 KPIs — owner sees financial KPIs, staff sees operational ════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {isOwner ? (
          <>
            <KpiCard icon="🎯" label="Ticket promedio"
              value={`S/ ${finance.avgTicket}`}
              sub={`${stats?.bookings_this_month ?? 0} servicios este mes`}
              accent="#601EF9" />
            <KpiCard icon="👥" label="Clientes"
              value={String(stats?.clients_total ?? '…')}
              sub={`+${stats?.clients_this_month ?? 0} nuevos este mes`}
              accent="#0ea5e9" />
            <KpiCard icon="📅" label="Citas hoy"
              value={String(stats?.bookings_today ?? (loadingTB ? '…' : todayBookings.length))}
              sub={`${stats?.events_next_7_days ?? 0} eventos próximos`}
              accent="#10b981" />
          </>
        ) : (
          <>
            <KpiCard icon="📅" label="Citas hoy"
              value={String(stats?.bookings_today ?? (loadingTB ? '…' : todayBookings.length))}
              sub="servicios programados"
              accent="#601EF9" />
            <KpiCard icon="🔔" label="Eventos próximos"
              value={String(stats?.events_next_7_days ?? '…')}
              sub="en los próximos 7 días"
              accent="#f59e0b" />
            <KpiCard icon="💬" label="Chats activos"
              value="—"
              sub="ver conversaciones"
              accent="#0ea5e9" />
          </>
        )}
      </div>

      {/* ══ ALERT STRIP — owner only, only shows if there's something to act on */}
      {isOwner && totalAlerts > 0 && (
        <div style={{
          display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 14,
          background: '#fffbeb', border: '1px solid #fde68a', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>
              {overdueEvents.length > 0 && `${overdueEvents.length} recordatorio${overdueEvents.length > 1 ? 's' : ''} vencido${overdueEvents.length > 1 ? 's' : ''}`}
              {overdueEvents.length > 0 && finance.inactiveClients.length > 0 && ' · '}
              {finance.inactiveClients.length > 0 && `${finance.inactiveClients.length} cliente${finance.inactiveClients.length > 1 ? 's' : ''} sin volver en 60+ días`}
            </p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>
              Atender esto puede generar ingresos directos
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {overdueEvents.length > 0 && (
              <button
                onClick={async () => {
                  setNotifying(true)
                  try {
                    await Promise.all(overdueEvents.map(e => api.notifyEvent(e.id)))
                    setOverdue([])
                    toast.success('✓ Recordatorios enviados')
                  } catch { toast.error('Error al notificar') }
                  finally { setNotifying(false) }
                }}
                disabled={notifying}
                style={{ padding: '7px 14px', borderRadius: 10, background: '#f59e0b', color: '#fff',
                  fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                {notifying ? '…' : '📨 Notificar'}
              </button>
            )}
            {finance.inactiveClients.length > 0 && (
              <Link href="/finances?tab=recover" style={{
                padding: '7px 14px', borderRadius: 10, background: '#92400e', color: '#fff',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
              }}>
                Ver clientes →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ══ MAIN GRID ═════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: 16 }}>

        {/* ── LEFT: agenda (staff) or business summary (owner) ───────── */}
        {isOwner ? (
          /* ── OWNER: Revenue breakdown ─────────────────────────────── */
          <Card>
            <CardHeader icon="📈" title="Resumen del mes"
              action={<Link href="/finances" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver finanzas →</Link>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Revenue comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Este mes', value: `S/ ${fmt(finance.revenueThisMonth)}`, accent: '#601EF9' },
                  { label: 'Mes anterior', value: `S/ ${fmt(finance.revenueLastMonth)}`, accent: '#64748b' },
                  { label: finance.revenueGrowth !== null ? (finance.revenueGrowth >= 0 ? `+${finance.revenueGrowth}% ↑` : `${finance.revenueGrowth}% ↓`) : '—',
                    value: 'vs anterior', accent: finance.revenueGrowth !== null && finance.revenueGrowth >= 0 ? '#16a34a' : '#dc2626' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '14px 12px', borderRadius: 12, background: '#F9F9FB', border: '1px solid #ede9fe', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: item.accent, margin: '0 0 4px', lineHeight: 1 }}>{item.value}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{item.label}</p>
                  </div>
                ))}
              </div>
              {/* Top services */}
              {finance.topServices.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 8px', letterSpacing: '0.05em' }}>POR SERVICIO ESTE MES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {finance.topServices.slice(0, 4).map((s, i) => {
                      const max = finance.topServices[0]?.revenue || 1
                      const colors = ['#601EF9','#0ea5e9','#10b981','#f59e0b']
                      return (
                        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', margin: 0, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                          <div style={{ flex: 1, height: 6, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, background: colors[i] || '#601EF9', width: `${Math.round((s.revenue/max)*100)}%`, transition: 'width 0.6s' }} />
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0, minWidth: 60, textAlign: 'right' }}>S/ {fmt(s.revenue)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Pending alert */}
              {finance.pendingCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>💰 {finance.pendingCount} cobro{finance.pendingCount > 1 ? 's' : ''} pendiente{finance.pendingCount > 1 ? 's' : ''}</p>
                  <Link href="/finances" style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textDecoration: 'none' }}>Cobrar →</Link>
                </div>
              )}
            </div>
          </Card>
        ) : (
          /* ── STAFF: Today's agenda ─────────────────────────────────── */
          <Card>
          <CardHeader
            icon="🗓️" title="Agenda de hoy"
            badge={todayBookings.length > 0 ? `${todayBookings.length} citas` : undefined}
            action={<Link href="/bookings" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver agenda →</Link>}
          />
          {loadingTB ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: '#F3EEFF' }} />)}
            </div>
          ) : todayBookings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 10 }}>
              <span style={{ fontSize: 32 }}>📋</span>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Sin citas hoy</p>
              <Link href="/bookings?new=1" style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                color: '#fff', background: '#601EF9', textDecoration: 'none',
              }}>
                + Nueva cita
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayBookings.slice(0, 5).map(b => {
                const st = S(b.status)
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                    borderRadius: 12, border: '1px solid #ede9fe', background: '#fafafa',
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#601EF9', margin: 0, minWidth: 42 }}>{b.time}</p>
                    <div style={{ width: 1, height: 28, background: '#ede9fe', flexShrink: 0 }} />
                    <span style={{ fontSize: 18 }}>{PET_EMOJI[b.pet?.type ?? 'other']}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.pet?.name ?? '?'} <span style={{ fontWeight: 400, color: '#64748b' }}>· {b.pet?.user?.name ?? b.pet?.user?.phone ?? '?'}</span>
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{b.notes ?? 'Servicio'}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, flexShrink: 0 }}>
                      {st.label}
                    </span>
                    {b.status === 'CONFIRMED' && (
                      <button onClick={() => completeBooking(b.id)} disabled={completingId === b.id}
                        style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                          background: '#601EF9', color: '#fff', border: 'none', cursor: 'pointer',
                          opacity: completingId === b.id ? 0.6 : 1, flexShrink: 0 }}>
                        {completingId === b.id ? '…' : '✓'}
                      </button>
                    )}
                  </div>
                )
              })}
              {todayBookings.length > 5 && (
                <Link href="/bookings" style={{ fontSize: 12, color: '#601EF9', fontWeight: 600, textDecoration: 'none', textAlign: 'center', paddingTop: 6 }}>
                  +{todayBookings.length - 5} citas más →
                </Link>
              )}
            </div>
          )}
        </Card>
        )} {/* end owner/staff left column */}

        {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {isOwner ? (
            /* ── OWNER: Business actions ──────────────────────────── */
            <>
              <Card>
                <CardHeader icon="🚀" title="Acciones del negocio" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: '📊', label: 'Ver finanzas completas', sub: 'Ingresos, clientes, tendencias', href: '/finances', accent: '#601EF9' },
                    { icon: '💰', label: 'Registrar cobro',        sub: 'Marca un servicio como pagado',  href: '/finances', accent: '#10b981' },
                    { icon: '🔄', label: 'Recuperar clientes',     sub: `${finance.inactiveClients.length} clientes inactivos`, href: '/finances?tab=recover', accent: '#f59e0b' },
                    { icon: '👥', label: 'Gestionar equipo',       sub: 'Invitar colaboradores',          href: '/settings?s=equipo', accent: '#0ea5e9' },
                  ].map(a => (
                    <Link key={a.label} href={a.href}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        borderRadius: 12, textDecoration: 'none', border: '1.5px solid #ede9fe', background: '#F9F9FB', transition: 'all 0.15s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F3EEFF'; el.style.borderColor = a.accent }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F9F9FB'; el.style.borderColor = '#ede9fe' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: a.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {a.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{a.label}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{a.sub}</p>
                      </div>
                      <span style={{ fontSize: 14, color: '#c4b5fd' }}>→</span>
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Top clients mini */}
              {finance.topClients.length > 0 && (
                <Card>
                  <CardHeader icon="⭐" title="Mejores clientes"
                    action={<Link href="/finances?tab=clients" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver todos →</Link>}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {finance.topClients.slice(0, 3).map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                        <span style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>{['🥇','🥈','🥉'][i]}</span>
                        <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#601EF9', margin: 0 }}>S/ {fmt(c.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            /* ── STAFF: Quick actions + overdue ─────────────────────── */
            <>
              <Card>
                <CardHeader icon="⚡" title="Acciones rápidas" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { icon: '📅', label: 'Nueva cita',    href: '/bookings?new=1' },
                    { icon: '👤', label: 'Nuevo cliente', href: '/clients' },
                    { icon: '📆', label: 'Eventos',       href: '/events' },
                    { icon: '💬', label: 'WhatsApp',      href: '/chats' },
                  ].map(a => (
                    <Link key={a.label} href={a.href}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        padding: '14px 8px', borderRadius: 12, textAlign: 'center', textDecoration: 'none',
                        background: '#F9F9FB', border: '1.5px solid #ede9fe' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F3EEFF'; el.style.borderColor = '#c4b5fd' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F9F9FB'; el.style.borderColor = '#ede9fe' }}>
                      <span style={{ fontSize: 22 }}>{a.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{a.label}</span>
                    </Link>
                  ))}
                </div>
              </Card>

              {overdueEvents.length > 0 && (
                <Card>
                  <CardHeader icon="🔔" title="Vencidos" badge={String(overdueEvents.length)} badgeRed
                    action={<Link href="/events" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver →</Link>}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {overdueEvents.slice(0, 3).map(e => {
                      const days = Math.floor((Date.now() - new Date(e.scheduled_date).getTime()) / 86400000)
                      return (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 11px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.pet?.name ?? '?'} · {e.pet?.user?.name ?? '?'}
                            </p>
                            <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{EVENT_LABEL[e.type] ?? e.type} · {days}d</p>
                          </div>
                          <button onClick={async () => {
                            await api.notifyEvent(e.id)
                            setOverdue(prev => prev.filter(x => x.id !== e.id))
                            toast.success('Enviado')
                          }} style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 8,
                            background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                            📨
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader icon="🔗" title="Ir a" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { icon: '👤', label: 'Todos los clientes', href: '/clients'  },
                    { icon: '📆', label: 'Recordatorios',      href: '/events'   },
                    { icon: '💬', label: 'Conversaciones',     href: '/chats'    },
                    { icon: '⚙️', label: 'Configuración',      href: '/settings' },
                  ].map(l => (
                    <Link key={l.href} href={l.href}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3EEFF'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <span style={{ fontSize: 15 }}>{l.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{l.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#c4b5fd' }}>→</span>
                    </Link>
                  ))}
                </div>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 16, padding: 20, boxShadow: '0 1px 6px rgba(96,30,249,0.05)' }}>
      {children}
    </div>
  )
}

function CardHeader({ icon, title, badge, badgeRed, action }: {
  icon: string; title: string; badge?: string; badgeRed?: boolean; action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{title}</span>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: badgeRed ? '#fef2f2' : '#F3EEFF', color: badgeRed ? '#dc2626' : '#601EF9' }}>
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, accent }: {
  icon: string; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 14,
      padding: '16px 18px', boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 10 }}>
        {icon}
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: accent, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
    </div>
  )
}
