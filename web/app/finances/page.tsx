'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
type PaymentMethod = 'cash' | 'transfer' | 'card' | 'yape' | 'other'

interface Payment {
  id: string
  amount: number
  method: PaymentMethod
  description: string | null
  date: string
  created_at: string
  booking_id: string | null
  client: { id: string; name?: string; phone: string } | null
  pet:    { id: string; name: string; type: string }   | null
  booking: { id: string; date: string; time: string; notes?: string } | null
}

interface Stats {
  today:     { total: number; count: number }
  week:      { total: number; count: number }
  month:     { total: number; count: number }
  by_method: Record<string, number>
}

// ─── Constants ───────────────────────────────────────────────────────────────
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash:     'Efectivo',
  transfer: 'Transferencia',
  card:     'Tarjeta',
  yape:     'Yape/Plin',
  other:    'Otro',
}
const METHOD_COLOR: Record<PaymentMethod, { bg: string; text: string; dot: string }> = {
  cash:     { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
  transfer: { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6' },
  card:     { bg: '#fdf4ff', text: '#9333ea', dot: '#a855f7' },
  yape:     { bg: '#fff7ed', text: '#ea580c', dot: '#f97316' },
  other:    { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
}
const METHODS: PaymentMethod[] = ['cash', 'transfer', 'card', 'yape', 'other']

function fmt(n: number) {
  return 'S/ ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function fmtShort(n: number) {
  if (n >= 1000) return 'S/ ' + (n / 1000).toFixed(1) + 'k'
  return fmt(n)
}
function dateLabel(d: Date) {
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const toast = useToast()

  const [payments, setPayments]     = useState<Payment[]>([])
  const [stats, setStats]           = useState<Stats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [viewDate, setViewDate] = useState(() => new Date().toISOString().slice(0, 10))

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        api.getPayments({ date: viewDate }) as Promise<Payment[]>,
        api.getPaymentStats() as Promise<Stats>,
      ])
      setPayments(p)
      setStats(s)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [viewDate])

  useEffect(() => { loadPayments() }, [loadPayments])

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este pago?')) return
    setDeletingId(id)
    try {
      await api.deletePayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
      if (stats) {
        const p = payments.find(x => x.id === id)
        if (p) {
          const amt = Number(p.amount)
          setStats(s => s ? ({
            ...s,
            today: { total: s.today.total - amt, count: s.today.count - 1 },
            week:  { total: s.week.total  - amt, count: s.week.count  - 1 },
            month: { total: s.month.total - amt, count: s.month.count - 1 },
          }) : s)
        }
      }
      toast.success('Pago eliminado')
    } catch { toast.error('Error al eliminar') }
    finally { setDeletingId(null) }
  }

  const prevDay = () => {
    const d = new Date(viewDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setViewDate(d.toISOString().slice(0, 10))
  }
  const nextDay = () => {
    const d = new Date(viewDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setViewDate(d.toISOString().slice(0, 10))
  }
  const isToday = viewDate === new Date().toISOString().slice(0, 10)
  const viewDateObj = new Date(viewDate + 'T12:00:00')

  const totalView = payments.reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Finanzas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Registro de ingresos de la clínica</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}
        >
          <span className="text-base">+</span> Registrar pago
        </button>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Hoy"
          total={stats?.today.total ?? 0}
          count={stats?.today.count ?? 0}
          color="#601EF9"
          highlight
        />
        <StatCard
          label="Esta semana"
          total={stats?.week.total ?? 0}
          count={stats?.week.count ?? 0}
          color="#10b981"
        />
        <StatCard
          label="Este mes"
          total={stats?.month.total ?? 0}
          count={stats?.month.count ?? 0}
          color="#f59e0b"
        />
      </div>

      {/* ── Method breakdown ── */}
      {stats && stats.today.total > 0 && (
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
            Medios de pago hoy
          </p>
          <div className="flex flex-wrap gap-2">
            {METHODS.filter(m => (stats.by_method[m] ?? 0) > 0).map(m => {
              const val = stats.by_method[m] ?? 0
              const pct = stats.today.total > 0 ? Math.round((val / stats.today.total) * 100) : 0
              const c   = METHOD_COLOR[m]
              return (
                <div key={m} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: c.bg }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
                  <span className="text-xs font-semibold" style={{ color: c.text }}>
                    {METHOD_LABEL[m]}
                  </span>
                  <span className="text-xs font-bold" style={{ color: c.text }}>
                    {fmt(val)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: c.dot + '25', color: c.text }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
          {/* Mini bar chart */}
          <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-0.5">
            {METHODS.filter(m => (stats.by_method[m] ?? 0) > 0).map(m => {
              const pct = stats.today.total > 0
                ? (stats.by_method[m] / stats.today.total) * 100
                : 0
              return (
                <div key={m} style={{ width: `${pct}%`, background: METHOD_COLOR[m].dot, minWidth: 4 }} />
              )
            })}
          </div>
        </div>
      )}

      {/* ── Payments list ── */}
      <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
        {/* Date nav */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2">
            <button onClick={prevDay}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#F3EEFF', color: '#601EF9' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <p className="text-sm font-bold capitalize" style={{ color: '#0f172a' }}>
                {isToday ? 'Hoy' : dateLabel(viewDateObj)}
              </p>
              <p className="text-[11px]" style={{ color: '#94a3b8' }}>{viewDate}</p>
            </div>
            <button onClick={nextDay} disabled={isToday}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: '#F3EEFF', color: '#601EF9' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {!isToday && (
              <button onClick={() => setViewDate(new Date().toISOString().slice(0, 10))}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: '#F3EEFF', color: '#601EF9' }}>
                Hoy
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: '#0f172a' }}>{fmt(totalView)}</p>
            <p className="text-[11px]" style={{ color: '#94a3b8' }}>{payments.length} pagos</p>
          </div>
        </div>

        {/* List */}
        <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {loading ? (
            <div className="flex flex-col gap-2 p-5">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <span className="text-4xl">💰</span>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Sin pagos registrados</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {isToday ? 'Registrá el primer pago del día' : 'No hubo pagos este día'}
              </p>
              {isToday && (
                <button onClick={() => setShowModal(true)}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white"
                  style={{ background: '#601EF9' }}>
                  + Registrar pago
                </button>
              )}
            </div>
          ) : (
            payments.map(p => (
              <PaymentRow
                key={p.id}
                payment={p}
                onDelete={() => handleDelete(p.id)}
                deleting={deletingId === p.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <PaymentModal
          onClose={() => setShowModal(false)}
          onSaved={(p) => {
            if (p.date === viewDate) setPayments(prev => [p, ...prev])
            loadPayments()
            setShowModal(false)
            toast.success('Pago registrado')
          }}
        />
      )}
    </div>
  )
}

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({ label, total, count, color, highlight }: {
  label: string; total: number; count: number; color: string; highlight?: boolean
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        background: highlight ? `linear-gradient(135deg,#3b10b5,#601EF9)` : '#fff',
        border: highlight ? 'none' : '1px solid #ede9fe',
      }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: highlight ? '#c4b5fd' : '#94a3b8' }}>
        {label}
      </p>
      <p className="text-xl font-bold leading-tight"
        style={{ color: highlight ? '#fff' : '#0f172a' }}>
        {fmtShort(total)}
      </p>
      <p className="text-[11px] font-medium"
        style={{ color: highlight ? '#ddd6fe' : '#94a3b8' }}>
        {count} {count === 1 ? 'pago' : 'pagos'}
      </p>
      {!highlight && (
        <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: '#f1f5f9' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / 1000) * 100)}%`, background: color }} />
        </div>
      )}
    </div>
  )
}

// ─── PaymentRow ───────────────────────────────────────────────────────────────
function PaymentRow({ payment: p, onDelete, deleting }: {
  payment: Payment; onDelete: () => void; deleting: boolean
}) {
  const c = METHOD_COLOR[p.method]
  const time = new Date(p.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const who  = p.client?.name ?? p.client?.phone ?? (p.pet ? p.pet.name : null) ?? 'Sin vincular'
  const desc = p.description ?? p.booking?.notes ?? METHOD_LABEL[p.method]

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
      {/* Method dot */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: c.bg }}>
        <span className="text-base">{methodEmoji(p.method)}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
            {who}
            {p.pet && <span className="font-normal text-xs" style={{ color: '#64748b' }}> · {p.pet.name}</span>}
          </p>
        </div>
        <p className="text-xs truncate" style={{ color: '#94a3b8' }}>
          {time} · {desc}
        </p>
      </div>

      {/* Method badge */}
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: c.bg, color: c.text }}>
        {METHOD_LABEL[p.method]}
      </span>

      {/* Amount */}
      <p className="text-sm font-bold shrink-0" style={{ color: '#0f172a' }}>
        {fmt(Number(p.amount))}
      </p>

      {/* Delete */}
      <button onClick={onDelete} disabled={deleting}
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-red-50 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function methodEmoji(m: PaymentMethod) {
  const e: Record<PaymentMethod, string> = {
    cash: 'S/', transfer: 'BK', card: 'CC', yape: 'YP', other: '??'
  }
  return e[m]
}

// ─── PaymentModal ────────────────────────────────────────────────────────────
function PaymentModal({ onClose, onSaved }: {
  onClose: () => void
  onSaved: (p: Payment) => void
}) {
  const [amount, setAmount]     = useState('')
  const [method, setMethod]     = useState<PaymentMethod>('cash')
  const [desc, setDesc]         = useState('')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Ingresá un monto válido mayor a 0')
      return
    }
    setSaving(true)
    try {
      const p = await api.createPayment({
        amount: amt, method, description: desc || undefined, date,
      }) as Payment
      onSaved(p)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Registrar pago</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
              Monto (S/)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-lg font-bold outline-none"
              style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
              autoFocus
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
              Medio de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => {
                const c       = METHOD_COLOR[m]
                const active  = method === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className="py-2 px-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: active ? c.bg : '#F9F9FB',
                      color:      active ? c.text : '#64748b',
                      border:     active ? `1.5px solid ${c.dot}` : '1.5px solid #e2e8f0',
                    }}
                  >
                    {METHOD_LABEL[m]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
              Descripción <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Baño Max, Vacuna antirrábica..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold px-3 py-2 rounded-lg"
              style={{ background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F1F5F9', color: '#475569' }}>
              Cancelar
            </button>
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
