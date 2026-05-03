'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

type PaymentMethod = 'cash' | 'transfer' | 'card' | 'yape' | 'other'

interface Payment {
  id: string; amount: number; method: PaymentMethod
  description: string | null; date: string; created_at: string; booking_id: string | null
  client: { id: string; name?: string; phone: string } | null
  pet:    { id: string; name: string; type: string }   | null
  booking: { id: string; date: string; time: string; notes?: string } | null
}
interface Stats {
  today:       { total: number; count: number }
  week:        { total: number; count: number }
  month:       { total: number; count: number }
  last_month:  { total: number }
  by_method:   Record<string, number>
  daily_chart: { date: string; total: number }[]
  by_service:  { name: string; total: number; count: number }[]
}
interface PendingBooking {
  id: string; date: string; time: string; price: number | null; notes?: string
  pet: { id: string; name: string; type: string; default_price: number | null
         user: { id: string; name?: string; phone: string } | null } | null
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', yape: 'Yape/Plin', other: 'Otro',
}
const METHOD_COLOR: Record<PaymentMethod, { bg: string; text: string; dot: string }> = {
  cash:     { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
  transfer: { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6' },
  card:     { bg: '#fdf4ff', text: '#9333ea', dot: '#a855f7' },
  yape:     { bg: '#fff7ed', text: '#ea580c', dot: '#f97316' },
  other:    { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
}
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'card', 'yape', 'other']

const fmt  = (n: number) => 'S/ ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fmtK = (n: number) => n >= 1000 ? 'S/ ' + (n/1000).toFixed(1) + 'k' : fmt(n)
const todayISO = () => new Date().toISOString().slice(0, 10)

function exportCSV(payments: Payment[], date: string) {
  const rows = [
    ['Fecha', 'Hora', 'Cliente', 'Mascota', 'Descripcion', 'Metodo', 'Monto'].join(','),
    ...payments.map(p => [
      p.date,
      new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      p.client?.name ?? p.client?.phone ?? '',
      p.pet?.name ?? '',
      p.description ?? '',
      METHOD_LABEL[p.method],
      p.amount,
    ].join(','))
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `pagos-${date}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function FinancesPage() {
  const toast = useToast()

  const [payments, setPayments]       = useState<Payment[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [pending, setPending]         = useState<PendingBooking[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [payingBooking, setPayingBooking] = useState<PendingBooking | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [viewDate, setViewDate]       = useState(todayISO)
  const [activeTab, setActiveTab]     = useState<'payments' | 'pending' | 'services'>('payments')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s, pend] = await Promise.all([
        api.getPayments({ date: viewDate }) as Promise<Payment[]>,
        api.getPaymentStats()              as Promise<Stats>,
        api.getPendingPayments()           as Promise<PendingBooking[]>,
      ])
      setPayments(p); setStats(s); setPending(pend)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [viewDate])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este pago?')) return
    setDeletingId(id)
    try {
      await api.deletePayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
      toast.success('Pago eliminado')
      load()
    } catch { toast.error('Error al eliminar') }
    finally { setDeletingId(null) }
  }

  const navigate = (delta: number) => {
    const d = new Date(viewDate + 'T12:00:00'); d.setDate(d.getDate() + delta)
    setViewDate(d.toISOString().slice(0, 10))
  }

  const isToday    = viewDate === todayISO()
  const totalView  = payments.reduce((a, p) => a + Number(p.amount), 0)
  const monthDelta = stats ? stats.month.total - stats.last_month.total : 0

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Finanzas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Ingresos de la clínica</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(payments, viewDate)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#F3EEFF', color: '#601EF9' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            + Registrar pago
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#c4b5fd' }}>Hoy</p>
          <p className="text-2xl font-bold text-white">{fmtK(stats?.today.total ?? 0)}</p>
          <p className="text-[11px] mt-1" style={{ color: '#ddd6fe' }}>{stats?.today.count ?? 0} pagos</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Esta semana</p>
          <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{fmtK(stats?.week.total ?? 0)}</p>
          <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{stats?.week.count ?? 0} pagos</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Este mes</p>
          <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{fmtK(stats?.month.total ?? 0)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[11px] font-semibold"
              style={{ color: monthDelta >= 0 ? '#16a34a' : '#dc2626' }}>
              {monthDelta >= 0 ? '+' : ''}{fmtK(Math.abs(monthDelta))} vs mes ant.
            </span>
          </div>
        </div>
      </div>

      {/* Daily chart */}
      {stats && stats.daily_chart.length > 1 && (
        <DailyChart data={stats.daily_chart} today={todayISO()} />
      )}

      {/* Method breakdown (today) */}
      {stats && stats.today.total > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>Medios de pago — hoy</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {METHODS.filter(m => (stats.by_method[m] ?? 0) > 0).map(m => {
              const val = stats.by_method[m]; const c = METHOD_COLOR[m]
              const pct = Math.round((val / stats.today.total) * 100)
              return (
                <div key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: c.bg }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                  <span className="text-xs font-semibold" style={{ color: c.text }}>{METHOD_LABEL[m]}</span>
                  <span className="text-xs font-bold" style={{ color: c.text }}>{fmt(val)}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded-full font-semibold"
                    style={{ background: c.dot + '22', color: c.text }}>{pct}%</span>
                </div>
              )
            })}
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
            {METHODS.filter(m => (stats.by_method[m] ?? 0) > 0).map(m => (
              <div key={m} style={{ width: `${(stats.by_method[m] / stats.today.total) * 100}%`,
                background: METHOD_COLOR[m].dot, minWidth: 4 }} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F3EEFF' }}>
        {([
          { id: 'payments', label: 'Pagos del día' },
          { id: 'pending',  label: `Cobros pendientes${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { id: 'services', label: 'Por servicio' },
        ] as { id: typeof activeTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: activeTab === t.id ? '#fff' : 'transparent',
              color:      activeTab === t.id ? '#601EF9' : '#64748b',
              boxShadow:  activeTab === t.id ? '0 1px 4px rgba(96,30,249,0.1)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Pagos del día */}
      {activeTab === 'payments' && (
        <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#F3EEFF', color: '#601EF9' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>
                  {isToday ? 'Hoy' : new Date(viewDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>{viewDate}</p>
              </div>
              <button onClick={() => navigate(1)} disabled={isToday}
                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                style={{ background: '#F3EEFF', color: '#601EF9' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {!isToday && (
                <button onClick={() => setViewDate(todayISO())}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}>Hoy</button>
              )}
            </div>
            <div className="text-right">
              <p className="text-base font-bold" style={{ color: '#0f172a' }}>{fmt(totalView)}</p>
              <p className="text-[11px]" style={{ color: '#94a3b8' }}>{payments.length} pagos</p>
            </div>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <span className="text-3xl">💰</span>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Sin pagos registrados</p>
              {isToday && (
                <button onClick={() => setShowModal(true)}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white mt-1"
                  style={{ background: '#601EF9' }}>+ Registrar pago</button>
              )}
            </div>
          ) : (
            <div>
              {payments.map(p => (
                <PaymentRow key={p.id} payment={p} onDelete={() => handleDelete(p.id)} deleting={deletingId === p.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Cobros pendientes */}
      {activeTab === 'pending' && (
        <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Servicios completados sin cobrar</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Últimos 7 días · sin pago registrado</p>
          </div>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Todo cobrado</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>No hay servicios pendientes de cobro</p>
            </div>
          ) : (
            <div className="divide-y">
              {pending.map(b => {
                const suggestedPrice = b.price ?? b.pet?.default_price ?? null
                return (
                  <div key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                        {b.pet?.name ?? '?'}
                        <span className="font-normal text-xs ml-1.5" style={{ color: '#64748b' }}>
                          {b.pet?.user?.name ?? b.pet?.user?.phone ?? ''}
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        {b.date} · {b.time} · {b.notes ?? 'Servicio'}
                      </p>
                    </div>
                    {suggestedPrice && (
                      <span className="text-sm font-bold" style={{ color: '#601EF9' }}>
                        {fmt(suggestedPrice)}
                      </span>
                    )}
                    <button
                      onClick={() => { setPayingBooking(b); setShowModal(true) }}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl text-white"
                      style={{ background: '#601EF9' }}>
                      Cobrar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Por servicio */}
      {activeTab === 'services' && (
        <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Ingresos por servicio</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Este mes · agrupado por descripción</p>
          </div>
          {!stats || stats.by_service.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <span className="text-3xl">📊</span>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Sin datos aún</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Registrá pagos con descripción para ver el desglose</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {(() => {
                const maxVal = Math.max(...stats.by_service.map(s => s.total), 1)
                return stats.by_service.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{s.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs" style={{ color: '#94a3b8' }}>{s.count} servs.</span>
                        <span className="text-sm font-bold" style={{ color: '#601EF9' }}>{fmt(s.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(s.total / maxVal) * 100}%`,
                          background: `hsl(${250 + i * 25}, 80%, ${55 + i * 5}%)` }} />
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <PaymentModal
          bookingDefault={payingBooking}
          onClose={() => { setShowModal(false); setPayingBooking(null) }}
          onSaved={() => { load(); setShowModal(false); setPayingBooking(null); toast.success('Pago registrado') }}
        />
      )}
    </div>
  )
}

// ─── DailyChart ──────────────────────────────────────────────────────────────
function DailyChart({ data, today }: { data: { date: string; total: number }[]; today: string }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
        Ingresos diarios — {new Date(today + 'T12:00:00').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
      </p>
      <div className="flex items-end gap-1" style={{ height: 72 }}>
        {data.map(d => {
          const pct   = (d.total / max) * 100
          const isT   = d.date === today
          const day   = new Date(d.date + 'T12:00:00').getDate()
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" style={{ minWidth: 0 }}>
              <div className="relative w-full flex items-end" style={{ height: 56 }}>
                {d.total > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(pct, 8)}%`,
                      background: isT ? '#601EF9' : '#ddd6fe',
                    }}>
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex
                      whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10"
                      style={{ background: '#0f172a', color: '#fff' }}>
                      {fmt(d.total)}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-medium" style={{ color: isT ? '#601EF9' : '#94a3b8' }}>
                {day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PaymentRow ───────────────────────────────────────────────────────────────
function PaymentRow({ payment: p, onDelete, deleting }: {
  payment: Payment; onDelete: () => void; deleting: boolean
}) {
  const c    = METHOD_COLOR[p.method]
  const time = new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const who  = p.client?.name ?? p.client?.phone ?? p.pet?.name ?? 'Sin vincular'
  const desc = p.description ?? p.booking?.notes ?? METHOD_LABEL[p.method]
  return (
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #f8fafc' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
          {who}{p.pet && p.client && <span className="font-normal text-xs" style={{ color: '#64748b' }}> · {p.pet.name}</span>}
        </p>
        <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{time} · {desc}</p>
      </div>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: c.bg, color: c.text }}>{METHOD_LABEL[p.method]}</span>
      <p className="text-sm font-bold shrink-0" style={{ color: '#0f172a' }}>{fmt(Number(p.amount))}</p>
      <button onClick={onDelete} disabled={deleting}
        className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 hover:bg-red-50">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────
function PaymentModal({ onClose, onSaved, bookingDefault }: {
  onClose: () => void; onSaved: () => void; bookingDefault?: PendingBooking | null
}) {
  const suggestedPrice = bookingDefault?.price ?? bookingDefault?.pet?.default_price ?? null
  const [amount, setAmount] = useState(suggestedPrice ? String(suggestedPrice) : '')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [desc, setDesc]     = useState(bookingDefault?.notes ?? bookingDefault?.pet?.name ?? '')
  const [date, setDate]     = useState(bookingDefault?.date ?? todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(amt) || amt <= 0) { setError('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await api.createPayment({
        amount: amt, method, date,
        description: desc || undefined,
        booking_id:  bookingDefault?.id,
        client_id:   bookingDefault?.pet?.user?.id,
        pet_id:      bookingDefault?.pet?.id,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Registrar pago</h2>
            {bookingDefault && (
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                {bookingDefault.pet?.name} · {bookingDefault.date} {bookingDefault.time}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Monto (S/)</label>
            <input type="number" step="0.01" min="0.01" placeholder="0.00"
              value={amount} onChange={e => setAmount(e.target.value)} autoFocus
              className="w-full px-3 py-2.5 rounded-xl text-xl font-bold outline-none"
              style={{ border: '1.5px solid #601EF9', color: '#0f172a' }} />
            {suggestedPrice && (
              <p className="text-[11px] mt-1" style={{ color: '#601EF9' }}>
                Precio sugerido: {fmt(suggestedPrice)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Medio de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => {
                const c = METHOD_COLOR[m]; const active = method === m
                return (
                  <button key={m} type="button" onClick={() => setMethod(m)}
                    className="py-2 px-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: active ? c.bg : '#F9F9FB',
                      color:      active ? c.text : '#64748b',
                      border:     active ? `1.5px solid ${c.dot}` : '1.5px solid #e2e8f0',
                    }}>
                    {METHOD_LABEL[m]}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
              Descripción <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input type="text" placeholder="Ej: Baño Max, Vacuna antirrábica..."
              value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
          </div>
          {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F1F5F9', color: '#475569' }}>Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
              {saving ? 'Guardando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
