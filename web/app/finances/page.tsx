'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, type FinanceSummary } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { useRole } from '@/hooks/useRole'

// ─── Demo data ─────────────────────────────────────────────────────────────
const DEMO: FinanceSummary = {
  revenueThisMonth: 4850,
  revenueLastMonth: 4200,
  revenueGrowth: 15,
  avgTicket: 68,
  pendingCount: 3,
  monthlyRevenue: [
    { month: '2025-12', label: 'Dic', revenue: 3200 },
    { month: '2026-01', label: 'Ene', revenue: 3800 },
    { month: '2026-02', label: 'Feb', revenue: 3500 },
    { month: '2026-03', label: 'Mar', revenue: 4100 },
    { month: '2026-04', label: 'Abr', revenue: 4200 },
    { month: '2026-05', label: 'May', revenue: 4850 },
  ],
  topServices: [
    { name: 'Baño y corte',     revenue: 1920, count: 24 },
    { name: 'Consulta general', revenue: 980,  count: 14 },
    { name: 'Vacunación',       revenue: 750,  count: 15 },
    { name: 'Desparasitación',  revenue: 680,  count: 12 },
    { name: 'Control mensual',  revenue: 520,  count: 8  },
  ],
  topClients: [
    { id: 'c1', name: 'María García', revenue: 420, count: 6 },
    { id: 'c2', name: 'Juan Pérez',   revenue: 385, count: 5 },
    { id: 'c3', name: 'Ana Torres',   revenue: 310, count: 4 },
    { id: 'c4', name: 'Rosa Chávez',  revenue: 280, count: 4 },
    { id: 'c5', name: 'Carlos Lima',  revenue: 245, count: 3 },
  ],
  inactiveClients: [
    { id: 'i1', name: 'Pedro Ríos',   phone: '+51987654321', days_inactive: 78 },
    { id: 'i2', name: 'Lucía Vargas', phone: '+51976543210', days_inactive: 91 },
    { id: 'i3', name: 'Marco Silva',  phone: '+51965432109', days_inactive: 65 },
    { id: 'i4', name: 'Diana Castro', phone: '+51954321098', days_inactive: 72 },
  ],
}

function fmt(n: number) { return n.toLocaleString('es-PE') }

export default function FinancesPage() {
  const toast             = useToast()
  const router            = useRouter()
  const { role, isOwner } = useRole()
  const [data, setData]     = useState<FinanceSummary>(DEMO)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [tab, setTab]       = useState<'overview' | 'clients' | 'recover'>('overview')

  // Redirect staff away immediately once role is resolved
  useEffect(() => {
    if (role === 'staff') router.replace('/')
  }, [role, router])

  useEffect(() => {
    api.getFinanceSummary()
      .then(d => {
        if (d && (d.revenueThisMonth > 0 || d.topClients.length > 0)) {
          setData(d); setIsDemo(false)
        } else {
          setIsDemo(true)
        }
        setLoading(false)
      })
      .catch(() => { setIsDemo(true); setLoading(false) })
  }, [])

  // Don't render anything until role is known (avoids flash for staff)
  if (role === 'loading' || !isOwner) return null

  const gr = data.revenueGrowth
  const maxRevenue = Math.max(...data.monthlyRevenue.map(m => m.revenue), 1)
  const totalRevenue = data.monthlyRevenue.reduce((s, m) => s + m.revenue, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Finanzas</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
            Resumen financiero de tu negocio
            {isDemo && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#92400e' }}>datos de ejemplo</span>}
          </p>
        </div>
        <Link href="/bookings" style={{ padding: '9px 18px', borderRadius: 12, background: '#601EF9', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + Registrar cobro
        </Link>
      </div>

      {/* Hero KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {/* Main: this month */}
        <div style={{
          gridColumn: 'span 2', borderRadius: 20, padding: '22px 26px',
          background: 'linear-gradient(135deg,#3b10b5 0%,#601EF9 55%,#7c3aff 100%)',
        }}>
          <p style={{ color: '#c4b5fd', fontSize: 11, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.06em' }}>INGRESOS ESTE MES</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#fff', fontSize: 40, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                {loading ? '···' : `S/ ${fmt(data.revenueThisMonth)}`}
              </p>
              <p style={{ color: '#c4b5fd', fontSize: 13, margin: '6px 0 0' }}>mes anterior: S/ {fmt(data.revenueLastMonth)}</p>
            </div>
            {gr !== null && (
              <div style={{ padding: '8px 14px', borderRadius: 12, marginBottom: 4,
                background: gr >= 0 ? 'rgba(134,239,172,0.2)' : 'rgba(252,165,165,0.2)' }}>
                <p style={{ color: gr >= 0 ? '#86efac' : '#fca5a5', fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {gr >= 0 ? '+' : ''}{gr}%
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '3px 0 0' }}>vs mes anterior</p>
              </div>
            )}
          </div>
        </div>

        <FinKpi icon="🎯" label="Ticket promedio" value={`S/ ${data.avgTicket}`}
          sub={`este mes: ${Math.round(data.revenueThisMonth / Math.max(data.avgTicket,1))} servicios`}
          accent="#601EF9" />

        <FinKpi icon="📈" label="Ingresos 6 meses" value={`S/ ${fmt(totalRevenue)}`}
          sub={`prom. mensual: S/ ${fmt(Math.round(totalRevenue / 6))}`}
          accent="#10b981" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 14, padding: 4, width: 'fit-content' }}>
        {([
          { id: 'overview', label: '📊 Resumen'  },
          { id: 'clients',  label: '🏆 Clientes' },
          { id: 'recover',  label: '🎯 Recuperar' },
        ] as { id: typeof tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#601EF9' : '#64748b',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

          {/* Revenue bar chart */}
          <FCard>
            <FCardHeader title="Ingresos mensuales" sub="Últimos 6 meses" />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, padding: '8px 0 0' }}>
              {data.monthlyRevenue.map((m, i) => {
                const isLast = i === data.monthlyRevenue.length - 1
                const heightPct = Math.max(8, Math.round((m.revenue / maxRevenue) * 100))
                return (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: isLast ? '#601EF9' : '#94a3b8', margin: 0 }}>
                      S/{m.revenue >= 1000 ? (m.revenue / 1000).toFixed(1) + 'k' : m.revenue}
                    </p>
                    <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', flex: 1 }}>
                      <div style={{ width: '70%', height: `${heightPct}%`, minHeight: 8, borderRadius: '6px 6px 0 0',
                        background: isLast ? 'linear-gradient(180deg,#601EF9,#3b10b5)' : '#e0e7ff',
                        transition: 'height 0.5s ease' }} />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: isLast ? 700 : 500, color: isLast ? '#601EF9' : '#94a3b8', margin: 0 }}>{m.label}</p>
                  </div>
                )
              })}
            </div>
            {/* MoM growth row */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
              {data.monthlyRevenue.slice(1).map((m, i) => {
                const prev = data.monthlyRevenue[i].revenue
                const delta = prev > 0 ? Math.round(((m.revenue - prev) / prev) * 100) : 0
                return (
                  <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, margin: 0, color: delta >= 0 ? '#10b981' : '#ef4444' }}>
                      {delta >= 0 ? '+' : ''}{delta}%
                    </p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{m.label}</p>
                  </div>
                )
              })}
            </div>
          </FCard>

          {/* Services breakdown */}
          <FCard>
            <FCardHeader title="Por servicio" sub="este mes" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.topServices.map((s, i) => {
                const pct = Math.round((s.revenue / (data.topServices[0]?.revenue || 1)) * 100)
                const colors = ['#601EF9','#0ea5e9','#10b981','#f59e0b','#ef4444']
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{s.name}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>S/ {fmt(s.revenue)}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{s.count}×</span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 6, background: colors[i], width: `${pct}%`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Color strip */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 0 8px' }}>DISTRIBUCIÓN</p>
              <div style={{ display: 'flex', height: 10, borderRadius: 8, overflow: 'hidden' }}>
                {data.topServices.map((s, i) => {
                  const total = data.topServices.reduce((a,x) => a+x.revenue,0)
                  const w = Math.round((s.revenue / total) * 100)
                  const colors = ['#601EF9','#0ea5e9','#10b981','#f59e0b','#ef4444']
                  return <div key={s.name} style={{ width: `${w}%`, background: colors[i] }} />
                })}
              </div>
            </div>
          </FCard>

          {/* Pending alert */}
          {data.pendingCount > 0 && (
            <FCard style={{ gridColumn: 'span 2', background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#92400e', margin: 0 }}>{data.pendingCount} servicio{data.pendingCount !== 1 ? 's' : ''} sin cobrar</p>
                    <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>Revisa la agenda y registra el cobro para tener tus finanzas al día</p>
                  </div>
                </div>
                <Link href="/bookings" style={{ padding: '9px 18px', borderRadius: 10, background: '#f59e0b', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Ver agenda →
                </Link>
              </div>
            </FCard>
          )}
        </div>
      )}

      {/* ── TAB: TOP CLIENTS ──────────────────────────────────────────── */}
      {tab === 'clients' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FCard>
            <FCardHeader title="Top clientes por gasto" sub="total histórico" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topClients.map((c, i) => {
                const maxSpend = data.topClients[0]?.revenue || 1
                const pct = Math.round((c.revenue / maxSpend) * 100)
                const medals = ['🥇','🥈','🥉']
                return (
                  <div key={c.id} style={{ padding: '12px 14px', borderRadius: 12,
                    background: i === 0 ? '#faf5ff' : '#F9F9FB',
                    border: `1px solid ${i === 0 ? '#ede9fe' : '#f1f5f9'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: i < 3 ? 18 : 12, fontWeight: 700, color: '#601EF9', minWidth: 24 }}>
                        {i < 3 ? medals[i] : `#${i + 1}`}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{c.count} visitas · S/ {Math.round(c.revenue / c.count)} por visita</p>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>S/ {fmt(c.revenue)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: '#e0e7ff', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#601EF9,#7c3aff)', width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </FCard>

          <FCard>
            <FCardHeader title="Insights de negocio" sub="" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InsightCard icon="💡" title="Concentración"
                body={`Tu cliente #1 genera S/ ${fmt(data.topClients[0]?.revenue ?? 0)}. Los top 3 representan ~${Math.round((data.topClients.slice(0,3).reduce((s,c)=>s+c.revenue,0) / Math.max(data.topClients.reduce((s,c)=>s+c.revenue,0),1)) * 100)}% de tus ingresos.`}
                color="#601EF9" bg="#F3EEFF" />
              <InsightCard icon="📅" title="Frecuencia"
                body={`Tus mejores clientes visitan ${Math.round(data.topClients.reduce((s,c)=>s+c.count,0)/Math.max(data.topClients.length,1))} veces en promedio. Activa recordatorios automáticos para mantener esa cadencia.`}
                color="#0ea5e9" bg="#f0f9ff" />
              <InsightCard icon="⭐" title="Acción recomendada"
                body="Considera un beneficio exclusivo para tus top 3 clientes. Retener un cliente cuesta 5x menos que conseguir uno nuevo."
                color="#10b981" bg="#f0fdf4" />
              <div style={{ padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px' }}>VALOR PROMEDIO POR CLIENTE</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#601EF9', margin: 0 }}>
                  S/ {fmt(Math.round(data.topClients.reduce((s,c)=>s+c.revenue,0) / Math.max(data.topClients.length,1)))}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>lifetime value promedio</p>
              </div>
            </div>
          </FCard>
        </div>
      )}

      {/* ── TAB: RECOVER CLIENTS ──────────────────────────────────────── */}
      {tab === 'recover' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
          <FCard>
            <FCardHeader title={`${data.inactiveClients.length} clientes sin volver`} sub="No han tenido una cita en más de 60 días" />
            {data.inactiveClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 36, margin: 0 }}>🎉</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#10b981', margin: '10px 0 4px' }}>¡No hay clientes inactivos!</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Todos tus clientes han visitado recientemente</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.inactiveClients.map((c, i) => {
                  const urgency = c.days_inactive > 90 ? '#ef4444' : c.days_inactive > 75 ? '#f59e0b' : '#10b981'
                  const urgencyBg = c.days_inactive > 90 ? '#fef2f2' : c.days_inactive > 75 ? '#fffbeb' : '#f0fdf4'
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      borderRadius: 14, background: i % 2 === 0 ? '#F9F9FB' : '#fff', border: '1px solid #f1f5f9' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#94a3b8,#64748b)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{c.name}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{c.phone}</p>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 10, background: urgencyBg, flexShrink: 0 }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: urgency, margin: 0 }}>{c.days_inactive}d</p>
                        <p style={{ fontSize: 9, fontWeight: 700, color: urgency, margin: 0, textTransform: 'uppercase' }}>sin visita</p>
                      </div>
                      <a href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '8px 14px', borderRadius: 10, background: '#25D366', color: '#fff',
                          fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                        💬 Contactar
                      </a>
                    </div>
                  )
                })}
              </div>
            )}
          </FCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FCard>
              <FCardHeader title="Ingreso potencial" sub="si los recuperas este mes" />
              <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>ESTIMADO</p>
                <p style={{ fontSize: 42, fontWeight: 900, color: '#ef4444', margin: 0, lineHeight: 1 }}>
                  S/ {fmt(data.inactiveClients.length * data.avgTicket * 2)}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0' }}>
                  {data.inactiveClients.length} clientes × 2 visitas × S/ {data.avgTicket}
                </p>
              </div>
            </FCard>

            <FCard>
              <FCardHeader title="Mensaje sugerido" sub="para WhatsApp" />
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6 }}>
                  "Hola [nombre]! 👋 Te escribimos de [clínica]. Hace un tiempo que no nos visitas y quisiéramos saber cómo está [mascota]. ¿Te gustaría agendar una cita esta semana? 🐾"
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText('Hola [nombre]! 👋 Te escribimos de [clínica]. Hace un tiempo que no nos visitas y quisiéramos saber cómo está [mascota]. ¿Te gustaría agendar una cita esta semana? 🐾')
                  toast.success('¡Mensaje copiado!')
                }}
                style={{ width: '100%', marginTop: 10, padding: '9px', borderRadius: 10,
                  border: '1.5px solid #601EF9', background: 'transparent', color: '#601EF9',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                📋 Copiar mensaje
              </button>
            </FCard>

            <FCard>
              <FCardHeader title="Por qué importa" sub="" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InsightCard icon="💰" title="5x más barato" body="Retener un cliente cuesta 5x menos que conseguir uno nuevo." color="#10b981" bg="#f0fdf4" />
                <InsightCard icon="🔄" title="Automatiza esto" body="Activa la automatización de re-engagement en Configuración para que el sistema lo haga solo." color="#601EF9" bg="#F3EEFF" />
              </div>
            </FCard>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 18, padding: 22,
      boxShadow: '0 1px 6px rgba(96,30,249,0.05)', ...style }}>
      {children}
    </div>
  )
}

function FCardHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

function FinKpi({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 18, padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: accent + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
        {icon}
      </div>
      <p style={{ fontSize: 26, fontWeight: 900, color: accent, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
    </div>
  )
}
function InsightCard({ icon, title, body, color, bg }: { icon: string; title: string; body: string; color: string; bg: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{title}</p>
      </div>
      <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{body}</p>
    </div>
  )
}
