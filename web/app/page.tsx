'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'

interface TodayBooking {
  id: string; time: string; status: string; notes?: string; price?: number
  pet: { id: string; name: string; type: string; user: { id: string; name?: string; phone: string } | null } | null
}
interface StatsData {
  bookings_today: number; bookings_yesterday: number
  bookings_this_week: number; bookings_last_week: number
  bookings_this_month: number; bookings_last_month: number
  clients_total: number; clients_this_month: number
  pets_total: number; events_pending: number; events_next_7_days: number; events_overdue: number
}
interface Conversation {
  id: string; client_name?: string; phone: string
  bot_active: boolean; unread_count: number; last_message?: string
}
interface UpcomingEvent {
  id: string; type: string; scheduled_date: string
  pet: { id: string; name: string; type: string; user: { id: string; name?: string; phone: string } | null } | null
}
interface OverdueEvent {
  id: string; type: string; scheduled_date: string
  pet: { id: string; name: string; user: { id: string; name?: string; phone: string } | null } | null
}
interface RouteStop {
  id: string; stop_order: number; address?: string; status?: string
  booking?: { id: string; time: string; notes?: string } | null
  client_name?: string
}
interface TodayRoute {
  id: string; name: string; driver_name?: string; stops: RouteStop[]
}

const PET_EMOJI: Record<string, string> = { dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾' }
const EVENT_LABEL: Record<string, string> = { vaccine: 'Vacuna', grooming: 'Baño', checkup: 'Consulta', deworming: 'Desparasitación' }
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmada' },
  PENDING:   { bg: '#fffbeb', color: '#d97706', label: 'Pendiente'  },
  COMPLETED: { bg: '#f1f5f9', color: '#64748b', label: 'Completada' },
  CANCELLED: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelada'  },
}

export default function DashboardPage() {
  const toast = useToast()
  const [stats, setStats]             = useState<StatsData | null>(null)
  const [loadingStats, setLS]         = useState(true)
  const [todayBookings, setTB]        = useState<TodayBooking[]>([])
  const [loadingTB, setLoadingTB]     = useState(true)
  const [conversations, setConvs]     = useState<Conversation[]>([])
  const [upcomingEvents, setUpcoming] = useState<UpcomingEvent[]>([])
  const [overdueEvents, setOverdue]   = useState<OverdueEvent[]>([])
  const [clinicName, setClinicName]   = useState('Mi Clínica')
  const [completingId, setCI]         = useState<string | null>(null)
  const [notifying, setNotifying]     = useState(false)
  const DEMO_ROUTES: TodayRoute[] = [
    {
      id: 'demo-1', name: 'Ruta Norte', driver_name: 'Carlos M.',
      stops: [
        { id: 's1', stop_order: 1, address: 'Av. Los Pinos 342, San Borja', status: 'completed', client_name: 'María García', booking: { id: 'b1', time: '09:00', notes: 'Baño y corte' } },
        { id: 's2', stop_order: 2, address: 'Jr. Las Flores 118, Surco', status: 'pending',   client_name: 'Juan Pérez',  booking: { id: 'b2', time: '10:30', notes: 'Vacuna antirrábica' } },
        { id: 's3', stop_order: 3, address: 'Calle Lima 55, Miraflores',  status: 'pending',   client_name: 'Ana Torres',  booking: { id: 'b3', time: '12:00', notes: 'Control general' } },
      ],
    },
    {
      id: 'demo-2', name: 'Ruta Sur', driver_name: 'Luis R.',
      stops: [
        { id: 's4', stop_order: 1, address: 'Av. Grau 890, Barranco',      status: 'completed', client_name: 'Rosa Chávez', booking: { id: 'b4', time: '08:30', notes: 'Desparasitación' } },
        { id: 's5', stop_order: 2, address: 'Jr. Tacna 210, Chorrillos',   status: 'pending',   client_name: 'Pedro Ríos',  booking: { id: 'b5', time: '11:00', notes: 'Baño medicado' } },
      ],
    },
  ]
  const [todayRoutes, setTodayRoutes] = useState<TodayRoute[]>(DEMO_ROUTES)

  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      if (meta?.clinic_name) setClinicName(meta.clinic_name)
    })
    api.getMyClinic()
      .then((d: unknown) => {
        const c = (d as { data?: { name?: string } })?.data
        if (c?.name) setClinicName(c.name)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    api.getStats().then(d => { setStats(d as StatsData); setLS(false) }).catch(() => setLS(false))
  }, [])

  useEffect(() => {
    api.getTodayBookings().then(d => { setTB(d as TodayBooking[]); setLoadingTB(false) }).catch(() => setLoadingTB(false))
  }, [])

  useEffect(() => {
    api.getConversations().then((d: unknown) => {
      const arr = (d as { data?: Conversation[] })?.data ?? (d as Conversation[])
      setConvs(Array.isArray(arr) ? arr.slice(0, 6) : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const to = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    api.getUpcomingEvents(todayStr, to).then(d => setUpcoming(d as UpcomingEvent[])).catch(() => {})
  }, [todayStr])

  useEffect(() => {
    api.getOverdueEvents().then(d => setOverdue(d as OverdueEvent[])).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/routes?date=${new Date().toISOString().slice(0,10)}`)
      .then(r => r.json())
      .then(d => { const arr = d?.data ?? d; if (Array.isArray(arr)) setTodayRoutes(arr) })
      .catch(() => {})
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

  const notifyAll = async () => {
    setNotifying(true)
    try {
      await Promise.all(overdueEvents.map(e => api.notifyEvent(e.id)))
      setOverdue([])
      toast.success('✓ Recordatorios enviados')
    } catch { toast.error('Error al notificar') }
    finally { setNotifying(false) }
  }

  const S = (k: string) => STATUS_STYLE[k] ?? STATUS_STYLE.PENDING
  const weekTrend = stats
    ? Math.round(((stats.bookings_this_week - stats.bookings_last_week) / Math.max(stats.bookings_last_week, 1)) * 100)
    : 0
  const monthIncome = (stats?.bookings_this_month ?? 0) * 62
  const todayIncome = todayBookings.reduce((s, b) => s + (b.price ?? 62), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>

      {/* ── BANNER ────────────────────────────────────────────── */}
      <Link href="/bookings" style={{
        display: 'block', borderRadius: 18, padding: '20px 24px',
        background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 55%,#7c3aff 100%)',
        textDecoration: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#c4b5fd', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Torre de control · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>{clinicName}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <BannerPill icon="📅" label="Citas hoy"  value={loadingStats ? '…' : String(stats?.bookings_today ?? 0)} />
            <BannerPill icon="⚠️" label="Vencidos"   value={String(overdueEvents.length)} alert={overdueEvents.length > 0} />
            <BannerPill icon="💬" label="Chats"       value={String(conversations.length)} />
            <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
              Ver agenda →
            </span>
          </div>
        </div>
      </Link>

      {/* ── STAT CARDS ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <StatCard icon="📅" label="Citas este mes"    value={loadingStats ? '…' : String(stats?.bookings_this_month ?? 0)}
          sub={weekTrend >= 0 ? `+${weekTrend}% vs sem. ant.` : `${weekTrend}% vs sem. ant.`}
          color="#601EF9" trend={weekTrend} />
        <StatCard icon="👥" label="Clientes totales"  value={loadingStats ? '…' : String(stats?.clients_total ?? 0)}
          sub={`+${stats?.clients_this_month ?? 0} este mes`} color="#0ea5e9" />
        <StatCard icon="💰" label="Ingresos est. mes" value={loadingStats ? '…' : `S/ ${monthIncome}`}
          sub={`${stats?.bookings_this_month ?? 0} servicios`} color="#10b981" />
        <StatCard icon="🔔" label="Eventos próximos"  value={loadingStats ? '…' : String(stats?.events_next_7_days ?? 0)}
          sub={`${stats?.events_overdue ?? 0} vencidos`}
          color={(stats?.events_overdue ?? 0) > 0 ? '#ef4444' : '#f59e0b'}
          alert={(stats?.events_overdue ?? 0) > 0} />
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* AGENDA DEL DÍA */}
          <Card>
            <CardHeader icon="🗓️" title="Agenda de hoy"
              badge={todayBookings.length > 0 ? `${todayBookings.length} citas` : undefined}
              action={<Link href="/bookings" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver agenda →</Link>}
            />
            {loadingTB ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map(i => <div key={i} style={{ height: 60, borderRadius: 12, background: '#F3EEFF' }} />)}
              </div>
            ) : todayBookings.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 10 }}>
                <span style={{ fontSize: 36 }}>📋</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Sin citas programadas hoy</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Agenda nuevas citas para verlas aquí</p>
                <Link href="/bookings?new=1" style={{ marginTop: 4, padding: '8px 18px', borderRadius: 10,
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  background: 'linear-gradient(135deg,#3b10b5,#601EF9)', textDecoration: 'none' }}>
                  + Nueva cita
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayBookings.map(b => {
                  const st = S(b.status)
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 12, border: '1px solid #ede9fe', background: '#fafafa' }}>
                      <div style={{ minWidth: 48, textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#601EF9', margin: 0 }}>{b.time}</p>
                      </div>
                      <div style={{ width: 1, height: 36, background: '#ede9fe', flexShrink: 0 }} />
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {PET_EMOJI[b.pet?.type ?? 'other']}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.pet?.name ?? '?'}{' '}
                          <span style={{ fontWeight: 400, color: '#64748b' }}>· {b.pet?.user?.name ?? b.pet?.user?.phone ?? '?'}</span>
                        </p>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 2 }}>{b.notes ?? 'Servicio'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                        {b.status === 'CONFIRMED' && (
                          <button onClick={() => completeBooking(b.id)} disabled={completingId === b.id}
                            style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                              background: '#601EF9', color: '#fff', border: 'none', cursor: 'pointer',
                              opacity: completingId === b.id ? 0.6 : 1 }}>
                            {completingId === b.id ? '…' : '✓'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 8, marginTop: 4, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <MiniStat label="Citas hoy"       value={String(todayBookings.length)} />
                  <MiniStat label="Est. ingresos"   value={`S/ ${todayIncome}`} />
                  <MiniStat label="Completadas"     value={String(todayBookings.filter(b => b.status === 'COMPLETED').length)} />
                </div>
              </div>
            )}
          </Card>

          {/* PRÓXIMOS 3 DÍAS */}
          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader icon="📆" title="Próximos 3 días"
                badge={`${upcomingEvents.length} eventos`}
                action={<Link href="/events" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver todos →</Link>}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcomingEvents.slice(0, 5).map(e => {
                  const d    = new Date(e.scheduled_date + 'T00:00:00')
                  const diff = Math.round((d.getTime() - Date.now()) / 86400000)
                  const chip = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff}d`
                  const chipColor = diff === 0 ? '#16a34a' : diff === 1 ? '#d97706' : '#601EF9'
                  const chipBg   = diff === 0 ? '#dcfce7' : diff === 1 ? '#fef3c7' : '#F3EEFF'
                  return (
                    <Link key={e.id} href={e.pet ? `/pets/${e.pet.id}` : '/events'}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        padding: '10px 12px', borderRadius: 10, background: '#F9F9FB',
                        border: '1px solid #ede9fe', textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{PET_EMOJI[e.pet?.type ?? 'other']}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                            {e.pet?.name ?? '?'}{' '}
                            <span style={{ fontWeight: 400, color: '#94a3b8' }}>· {e.pet?.user?.name ?? e.pet?.user?.phone ?? '?'}</span>
                          </p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                            {EVENT_LABEL[e.type] ?? e.type} · {e.scheduled_date}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: chipBg, color: chipColor, flexShrink: 0 }}>{chip}</span>
                    </Link>
                  )
                })}
              </div>
            </Card>
          )}

          {/* OPORTUNIDADES */}
          {overdueEvents.length > 0 && (
            <Card>
              <CardHeader icon="🎯" title="Oportunidades"
                badge={`${overdueEvents.length} sin notificar`} badgeRed
                action={
                  <button onClick={notifyAll} disabled={notifying}
                    style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                      background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                    {notifying ? 'Enviando…' : '📨 Notificar todos'}
                  </button>
                }
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overdueEvents.slice(0, 4).map(e => {
                  const days = Math.floor((Date.now() - new Date(e.scheduled_date).getTime()) / 86400000)
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      padding: '10px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0, display: 'inline-block' }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                            {e.pet?.name ?? '?'}{' '}
                            <span style={{ fontWeight: 400 }}>· {e.pet?.user?.name ?? e.pet?.user?.phone ?? '?'}</span>
                          </p>
                          <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>
                            {EVENT_LABEL[e.type] ?? e.type} · vencido hace {days}d
                          </p>
                        </div>
                      </div>
                      <button onClick={async () => {
                        await api.notifyEvent(e.id)
                        setOverdue(prev => prev.filter(x => x.id !== e.id))
                        toast.success('Recordatorio enviado')
                      }} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                        background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                        Notificar
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* RUTAS DEL DÍA */}
          <Card>
              <CardHeader icon="🗺️" title="Rutas de hoy"
                badge={`${todayRoutes.length} ruta${todayRoutes.length > 1 ? 's' : ''}`}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todayRoutes.map(route => (
                  <div key={route.id} style={{ border: '1px solid #ede9fe', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#F3EEFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#3b10b5' }}>{route.name}</span>
                      {route.driver_name && <span style={{ fontSize: 11, color: '#7c3aed' }}>🚗 {route.driver_name}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {(route.stops ?? []).slice(0, 5).map((stop, i) => (
                        <div key={stop.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '8px 12px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#601EF9',
                            color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{stop.stop_order}</span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {stop.address ?? stop.booking?.notes ?? `Parada ${stop.stop_order}`}
                            </p>
                            {stop.booking?.time && (
                              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>⏰ {stop.booking.time}</p>
                            )}
                          </div>
                          {stop.status && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                              background: stop.status === 'completed' ? '#dcfce7' : '#F3EEFF',
                              color: stop.status === 'completed' ? '#16a34a' : '#601EF9' }}>
                              {stop.status === 'completed' ? '✓' : '•'}
                            </span>
                          )}
                        </div>
                      ))}
                      {route.stops.length > 5 && (
                        <p style={{ fontSize: 11, color: '#94a3b8', padding: '6px 12px', margin: 0 }}>
                          +{route.stops.length - 5} paradas más
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {todayRoutes.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 8 }}>
                  <span style={{ fontSize: 28 }}>🗺️</span>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sin rutas para hoy</p>
                  <a href="/settings?s=logistica" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Crear ruta →</a>
                </div>
              )}
            </Card>

          {/* CONVERSACIONES */}
          <Card>
            <CardHeader icon="💬" title="Conversaciones"
              action={<Link href="/chats" style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', textDecoration: 'none' }}>Ver todas →</Link>}
            />
            {conversations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
                <span style={{ fontSize: 28 }}>💬</span>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sin conversaciones activas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {conversations.map(c => (
                  <Link key={c.id} href="/chats"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px',
                      borderRadius: 10, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3EEFF'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#601EF9,#3b10b5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {(c.client_name ?? c.phone).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.client_name ?? c.phone}
                        </p>
                        {c.unread_count > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                            background: '#601EF9', color: '#fff', flexShrink: 0 }}>{c.unread_count}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.bot_active ? '🤖 Bot · ' : ''}{c.last_message ?? 'Sin mensajes'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* ACCIONES RÁPIDAS */}
          <Card>
            <CardHeader icon="⚡" title="Acciones rápidas" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: '📅', label: 'Nueva cita',    href: '/bookings?new=1' },
                { icon: '👤', label: 'Nuevo cliente', href: '/clients' },
                { icon: '🐾', label: 'Nueva mascota', href: '/clients' },
                { icon: '📋', label: 'Nuevo evento',  href: '/events' },
              ].map(a => (
                <Link key={a.label} href={a.href}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 8px', borderRadius: 12, textAlign: 'center', textDecoration: 'none',
                    background: '#F9F9FB', border: '1.5px solid #ede9fe', transition: 'all 0.15s' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#F3EEFF'
                    el.style.borderColor = '#c4b5fd'
                    el.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#F9F9FB'
                    el.style.borderColor = '#ede9fe'
                    el.style.transform = 'translateY(0)'
                  }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* MÉTRICAS */}
          <Card>
            <CardHeader icon="📊" title="Rendimiento semanal" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MetricBar label="Servicios"         value={stats?.bookings_this_week ?? 0}
                max={Math.max(stats?.bookings_this_week ?? 0, stats?.bookings_last_week ?? 0, 10)}
                color="#601EF9" sub={`vs ${stats?.bookings_last_week ?? 0} sem. ant.`} loading={loadingStats} />
              <MetricBar label="Nuevos clientes"   value={stats?.clients_this_month ?? 0}
                max={Math.max(stats?.clients_this_month ?? 0, 10)}
                color="#0ea5e9" sub={`${stats?.clients_total ?? 0} total`} loading={loadingStats} />
              <MetricBar label="Eventos pendientes" value={stats?.events_pending ?? 0}
                max={Math.max(stats?.events_pending ?? 0, 10)}
                color="#f59e0b" sub={`${stats?.events_next_7_days ?? 0} próx. 7 días`} loading={loadingStats} />
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 16,
      padding: 20, boxShadow: '0 1px 6px rgba(96,30,249,0.05)' }}>
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

function BannerPill({ icon, label, value, alert }: {
  icon: string; label: string; value: string; alert?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10,
      background: alert && Number(value) > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.13)' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <p style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ color: alert && Number(value) > 0 ? '#fca5a5' : '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>{value}</p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, trend, alert }: {
  icon: string; label: string; value: string; sub: string; color: string; trend?: number; alert?: boolean
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 14,
      padding: '14px 16px', boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {trend !== undefined && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: trend >= 0 ? '#f0fdf4' : '#fef2f2', color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: alert ? '#ef4444' : color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 500, color: '#334155', margin: '4px 0 2px' }}>{label}</p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: '#F9F9FB', borderRadius: 8, padding: '8px 10px', border: '1px solid #ede9fe' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#601EF9', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{label}</p>
    </div>
  )
}

function MetricBar({ label, value, max, color, sub, loading }: {
  label: string; value: number; max: number; color: string; sub: string; loading: boolean
}) {
  const pct = Math.min(100, Math.max(4, Math.round((value / Math.max(max, 1)) * 100)))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</span>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{loading ? '…' : value}</span>
          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>{sub}</span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 6, background: color,
          width: `${pct}%`, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  )
}
