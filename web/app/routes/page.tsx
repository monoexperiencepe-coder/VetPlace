'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type RouteStatus = 'pending' | 'in_progress' | 'completed'
type StopStatus  = 'pending' | 'completed' | 'skipped'

interface RouteStop {
  id:          string
  route_id:    string
  stop_order:  number
  status:      StopStatus
  arrived_at?: string | null
  notes?:      string | null
  address?:    string | null
  distrito?:   string | null
  client_name?: string | null
  pet_name?:   string | null
  booking?:    { id: string; time: string; date: string } | null
}

interface Route {
  id:          string
  clinic_id:   string
  name:        string
  date:        string
  status:      RouteStatus
  driver_name?: string | null
  notes?:      string | null
  stops:       RouteStop[]
}

type DateFilter = 'today' | 'tomorrow' | 'custom'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateFor(filter: DateFilter, custom: string): string {
  const d = new Date()
  if (filter === 'tomorrow') d.setDate(d.getDate() + 1)
  if (filter === 'custom' && custom) return custom
  return d.toISOString().slice(0, 10)
}

function timeRange(stops: RouteStop[]): string {
  const times = stops
    .map(s => s.booking?.time)
    .filter(Boolean) as string[]
  if (times.length === 0) return '—'
  const sorted = [...times].sort()
  return `${sorted[0]} – ${sorted[sorted.length - 1]}`
}

function mapsUrl(stops: RouteStop[], clinicAddress: string): string {
  const waypoints = stops.map(s => encodeURIComponent(s.address ?? s.distrito ?? '')).join('/')
  return `https://www.google.com/maps/dir/${encodeURIComponent(clinicAddress)}/${waypoints}/${encodeURIComponent(clinicAddress)}`
}

function waText(route: Route): string {
  const range = timeRange(route.stops)
  const lines = route.stops.map(s =>
    `${s.stop_order}. ${s.booking?.time ?? '—'} · ${s.client_name ?? '?'} (${s.pet_name ?? '?'}) · ${s.distrito ?? s.address ?? '?'}`
  ).join('\n')
  return encodeURIComponent(`🛵 *${route.name}* (${range})\n${lines}`)
}

const STATUS_STYLES: Record<RouteStatus, { label: string; bg: string; color: string; dot: string }> = {
  pending:     { label: 'Pendiente',  bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  in_progress: { label: 'En ruta',    bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  completed:   { label: 'Completada', bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
}

const CLINIC_ADDRESS = 'Av. Santa Fe 2345, CABA'
const CLINIC_NAME    = 'Clínica VetPlace'

// ─── Modal: Nueva Ruta ────────────────────────────────────────────────────────
interface NewRouteModalProps {
  date:     string
  onClose:  () => void
  onSaved:  (route: Route) => void
}

function NewRouteModal({ date, onClose, onSaved }: NewRouteModalProps) {
  const toast   = useToast()
  const [name,   setName]   = useState(`Ruta ${date}`)
  const [driver, setDriver] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const route = await api.createRoute({ name: name.trim(), date, driver_name: driver || undefined }) as Route
      onSaved(route)
      toast.success('Ruta creada')
      onClose()
    } catch {
      toast.error('No se pudo crear la ruta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
          <p className="text-base font-bold" style={{ color: '#0f172a' }}>Nueva ruta</p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: '#64748b' }}>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid #e2e8f0' }} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: '#64748b' }}>Chofer (opcional)</label>
            <input value={driver} onChange={e => setDriver(e.target.value)}
              placeholder="Nombre del chofer"
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid #e2e8f0' }} />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: '#601EF9', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creando…' : 'Crear ruta'}
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F9F9FB', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RoutesPage() {
  const toast = useToast()
  const [routes,      setRoutes]      = useState<Route[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [dateFilter,  setDateFilter]  = useState<DateFilter>('today')
  const [customDate,  setCustomDate]  = useState('')
  const [showNewModal, setShowNewModal] = useState(false)

  const date = dateFor(dateFilter, customDate)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getRoutes(date) as Route[]
      setRoutes(data)
      if (data.length > 0 && !data.find(r => r.id === selectedId)) {
        setSelectedId(data[0].id)
      }
    } catch {
      toast.error('No se pudieron cargar las rutas')
    } finally {
      setLoading(false)
    }
  }, [date, toast, selectedId])

  useEffect(() => { load() }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = routes.find(r => r.id === selectedId) ?? null
  const totalStops     = routes.reduce((s, r) => s + r.stops.length, 0)
  const completedStops = routes.flatMap(r => r.stops).filter(s => s.status === 'completed').length

  const toggleStop = async (routeId: string, stop: RouteStop) => {
    const nextStatus: StopStatus = stop.status === 'completed' ? 'pending' : 'completed'
    // Optimistic
    setRoutes(prev => prev.map(r => r.id !== routeId ? r : {
      ...r,
      stops: r.stops.map(s => s.id !== stop.id ? s : {
        ...s,
        status: nextStatus,
        arrived_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      }),
    }))
    try {
      await api.updateRouteStop(routeId, stop.id, {
        status: nextStatus,
        arrived_at: nextStatus === 'completed' ? new Date().toISOString() : undefined,
      })
    } catch {
      toast.error('No se pudo actualizar la parada')
      load()
    }
  }

  const setRouteStatus = async (id: string, status: RouteStatus) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    try {
      await api.updateRoute(id, { status })
    } catch {
      toast.error('No se pudo actualizar el estado')
      load()
    }
  }

  const handleRouteSaved = (route: Route) => {
    setRoutes(prev => [...prev, route])
    setSelectedId(route.id)
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-88px)]">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl gap-1" style={{ background: '#F3EEFF' }}>
            {(['today', 'tomorrow', 'custom'] as DateFilter[]).map(f => (
              <button key={f} onClick={() => setDateFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={dateFilter === f ? { background: '#601EF9', color: '#fff' } : { color: '#601EF9' }}>
                {f === 'today' ? 'Hoy' : f === 'tomorrow' ? 'Mañana' : 'Fecha'}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl outline-none"
              style={{ background: '#fff', border: '1.5px solid #ede9fe', color: '#0f172a' }} />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-4 py-2 rounded-xl"
            style={{ background: '#fff', border: '1px solid #ede9fe' }}>
            <Stat label="Rutas"       value={String(routes.length)} />
            <div style={{ width: 1, height: 24, background: '#ede9fe' }} />
            <Stat label="Servicios"   value={String(totalStops)} />
            <div style={{ width: 1, height: 24, background: '#ede9fe' }} />
            <Stat label="Completados" value={`${completedStops}/${totalStops}`} color="#10b981" />
          </div>
          <ActionBtn icon="➕" label="Nueva ruta" primary onClick={() => setShowNewModal(true)} />
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && routes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-4xl">🛵</p>
          <p className="text-sm font-semibold" style={{ color: '#334155' }}>
            No hay rutas para {date === dateFor('today', '') ? 'hoy' : date}
          </p>
          <button onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: '#601EF9' }}>
            Crear primera ruta
          </button>
        </div>
      )}

      {/* ── LAYOUT 2 COLUMNAS ── */}
      {!loading && routes.length > 0 && selected && (
        <div className="flex gap-4 flex-1 min-h-0">

          {/* COLUMNA IZQUIERDA */}
          <div className="w-[420px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">

            {/* Lista de rutas */}
            <div className="space-y-2">
              {routes.map(r => {
                const st   = STATUS_STYLES[r.status]
                const done = r.stops.filter(s => s.status === 'completed').length
                const isSel = r.id === selectedId
                return (
                  <button key={r.id} onClick={() => setSelectedId(r.id)}
                    className="w-full text-left rounded-2xl p-4 transition-all"
                    style={{
                      background:  isSel ? '#F3EEFF' : '#fff',
                      border:      isSel ? '2px solid #601EF9' : '1.5px solid #ede9fe',
                      boxShadow:   isSel ? '0 0 0 3px rgba(96,30,249,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{r.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>🕐 {timeRange(r.stops)}</p>
                        {r.driver_name && (
                          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>🧑‍✈️ {r.driver_name}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
                        style={{ background: st.bg, color: st.color }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${r.stops.length ? (done / r.stops.length) * 100 : 0}%`, background: '#601EF9' }} />
                      </div>
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: '#601EF9' }}>
                        {done}/{r.stops.length} paradas
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Detalle de la ruta seleccionada */}
            <div className="rounded-2xl overflow-hidden flex-1"
              style={{ background: '#fff', border: '1.5px solid #ede9fe' }}>

              <div className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg,#F3EEFF,#ede9fe)', borderBottom: '1px solid #ddd6fe' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#3b10b5' }}>{selected.name}</p>
                  <p className="text-xs" style={{ color: '#7c3aed' }}>{timeRange(selected.stops)}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: STATUS_STYLES[selected.status].bg, color: STATUS_STYLES[selected.status].color }}>
                  {selected.stops.filter(s => s.status === 'completed').length}/{selected.stops.length} paradas
                </span>
              </div>

              <div className="px-4 pt-3 pb-2 overflow-y-auto" style={{ maxHeight: 380 }}>
                <ClinicStop label={CLINIC_NAME} sub={CLINIC_ADDRESS} isOrigin />
                {selected.stops.map((s, i) => (
                  <StopRow key={s.id} stop={s} isLast={i === selected.stops.length - 1}
                    onToggle={() => toggleStop(selected.id, s)} />
                ))}
                <ClinicStop label={CLINIC_NAME} sub={CLINIC_ADDRESS} />
              </div>

              <div className="px-4 pb-4 pt-2 space-y-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                <div className="flex flex-wrap gap-2">
                  <a href={mapsUrl(selected.stops, CLINIC_ADDRESS)} target="_blank" rel="noopener noreferrer">
                    <PillBtn icon="🗺️" label="Google Maps" />
                  </a>
                  <a href={`https://wa.me/?text=${waText(selected)}`} target="_blank" rel="noopener noreferrer">
                    <PillBtn icon="💬" label="Enviar por WhatsApp" />
                  </a>
                </div>
                <div className="flex gap-2">
                  {selected.status === 'pending' && (
                    <button onClick={() => setRouteStatus(selected.id, 'in_progress')}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition"
                      style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
                      🛵 Iniciar ruta
                    </button>
                  )}
                  {selected.status === 'in_progress' && (
                    <button onClick={() => setRouteStatus(selected.id, 'completed')}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition"
                      style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0' }}>
                      ✅ Marcar como completada
                    </button>
                  )}
                  {selected.status === 'completed' && (
                    <div className="flex-1 py-2 rounded-xl text-xs font-bold text-center"
                      style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      ✓ Ruta completada
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Mapa */}
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#fff', border: '1.5px solid #ede9fe', minHeight: 0 }}>

            <div className="px-4 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🗺️</span>
                <span className="text-sm font-bold" style={{ color: '#0f172a' }}>Mapa de ruta</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}>
                  {selected.name}
                </span>
              </div>
              <a href={mapsUrl(selected.stops, CLINIC_ADDRESS)} target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1"
                style={{ background: '#F3EEFF', color: '#601EF9' }}>
                Abrir en Maps →
              </a>
            </div>

            <div className="flex-1 relative overflow-hidden" style={{ background: '#f8f8fc', minHeight: 0 }}>
              <RouteMapVisual stops={selected.stops} clinicName={CLINIC_NAME} />
            </div>

            <div className="px-4 py-3 flex items-center gap-4 flex-wrap shrink-0"
              style={{ borderTop: '1px solid #f1f5f9' }}>
              <LegendItem color="#601EF9" label="Clínica (origen/retorno)" isSquare />
              <LegendItem color="#601EF9" label="Parada pendiente" />
              <LegendItem color="#10b981" label="Parada completada" />
              <LegendItem color="#f59e0b" label="Parada con nota" isDash />
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewRouteModal date={date} onClose={() => setShowNewModal(false)} onSaved={handleRouteSaved} />
      )}
    </div>
  )
}

// ─── Mapa visual SVG ──────────────────────────────────────────────────────────
function RouteMapVisual({ stops, clinicName }: { stops: RouteStop[]; clinicName: string }) {
  const W = 800; const H = 500; const pad = 60

  const positions = stops.map((_, i) => {
    const cols = 3
    const col  = i % cols
    const row  = Math.floor(i / cols)
    const xStep = (W - pad * 2) / (cols - 1 || 1)
    const yStep = (H - pad * 2 - 80) / (Math.ceil(stops.length / cols) || 1)
    return { x: pad + col * xStep, y: pad + 80 + row * yStep + (col % 2 === 1 ? yStep / 2 : 0) }
  })

  const clinicStart = { x: pad,     y: pad + 30 }
  const clinicEnd   = { x: W - pad, y: H - pad  }
  const allPoints   = [clinicStart, ...positions, clinicEnd]
  const pathD       = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '100%' }}>
        <rect x="0" y="0" width={W} height={H} fill="#f8f8fc" rx="8" />
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * H / 7} x2={W} y2={i * H / 7} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={i * W / 11} y1={0} x2={i * W / 11} y2={H} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        <path d={pathD} fill="none" stroke="#ddd6fe" strokeWidth="3" strokeDasharray="8 4" />
        <path d={pathD} fill="none" stroke="#601EF9" strokeWidth="2.5" strokeDasharray="8 4" opacity="0.7" />

        <g>
          <rect x={clinicStart.x - 20} y={clinicStart.y - 16} width={40} height={32} rx={8} fill="#601EF9" />
          <text x={clinicStart.x} y={clinicStart.y + 5} textAnchor="middle" fontSize="14" fill="white">🏥</text>
          <text x={clinicStart.x} y={clinicStart.y + 28} textAnchor="middle" fontSize="9" fill="#601EF9" fontWeight="600">
            {clinicName.slice(0, 12)}
          </text>
        </g>

        {stops.map((s, i) => {
          const p = positions[i]
          if (!p) return null
          const done = s.status === 'completed'
          return (
            <g key={s.id}>
              <circle cx={p.x} cy={p.y + 2} r={16} fill="rgba(0,0,0,0.08)" />
              <circle cx={p.x} cy={p.y} r={16} fill={done ? '#10b981' : '#601EF9'} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">
                {s.stop_order}
              </text>
              <rect x={p.x - 38} y={p.y + 22} width={76} height={28} rx={6}
                fill="white" stroke={done ? '#bbf7d0' : '#ddd6fe'} strokeWidth="1.5" />
              <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="8.5" fill="#0f172a" fontWeight="600">
                {(s.client_name ?? '?').split(' ')[0]}
              </text>
              <text x={p.x} y={p.y + 44} textAnchor="middle" fontSize="8" fill="#94a3b8">
                {s.booking?.time ?? '—'} · {s.distrito ?? s.address ?? '—'}
              </text>
              {s.notes && <circle cx={p.x + 14} cy={p.y - 12} r={5} fill="#f59e0b" />}
              {done && <text x={p.x + 12} y={p.y - 8} fontSize="10" fill="#10b981">✓</text>}
            </g>
          )
        })}

        <g>
          <rect x={clinicEnd.x - 20} y={clinicEnd.y - 16} width={40} height={32} rx={8} fill="#3b10b5" />
          <text x={clinicEnd.x} y={clinicEnd.y + 5} textAnchor="middle" fontSize="14" fill="white">🏥</text>
          <text x={clinicEnd.x} y={clinicEnd.y + 28} textAnchor="middle" fontSize="9" fill="#3b10b5" fontWeight="600">
            Retorno
          </text>
        </g>
      </svg>
    </div>
  )
}

// ─── StopRow ──────────────────────────────────────────────────────────────────
function StopRow({ stop, isLast, onToggle }: { stop: RouteStop; isLast: boolean; onToggle: () => void }) {
  const done = stop.status === 'completed'
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="flex flex-col items-center shrink-0 mt-1" style={{ width: 28 }}>
        <button onClick={onToggle}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
          style={done
            ? { background: '#10b981', color: '#fff' }
            : { background: '#F3EEFF', color: '#601EF9', border: '2px solid #ddd6fe' }}>
          {done ? '✓' : stop.stop_order}
        </button>
        {!isLast && <div className="w-0.5 flex-1 mt-0.5 min-h-[20px]" style={{ background: '#ede9fe' }} />}
      </div>
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight"
              style={{ color: done ? '#94a3b8' : '#0f172a', textDecoration: done ? 'line-through' : 'none' }}>
              🐾 {stop.pet_name ?? '?'} · {stop.client_name ?? '?'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
              📍 {stop.distrito ?? '—'} · {stop.address ?? '—'}
            </p>
            {stop.notes && (
              <p className="text-[11px] mt-1 px-2 py-0.5 rounded-lg inline-block"
                style={{ background: '#fffbeb', color: '#d97706' }}>
                ⚠️ {stop.notes}
              </p>
            )}
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: done ? '#94a3b8' : '#601EF9' }}>
            {stop.booking?.time ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ClinicStop({ label, sub, isOrigin }: { label: string; sub: string; isOrigin?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="flex flex-col items-center shrink-0 mt-1" style={{ width: 28 }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: '#601EF9' }}>🏥</div>
        {isOrigin && <div className="w-0.5 min-h-[20px] mt-0.5" style={{ background: '#ede9fe' }} />}
      </div>
      <div className="flex-1 pb-3">
        <p className="text-sm font-bold" style={{ color: '#601EF9' }}>{label} {isOrigin ? '(Origen)' : '(Retorno)'}</p>
        <p className="text-[11px]" style={{ color: '#94a3b8' }}>📍 {sub}</p>
      </div>
    </div>
  )
}

// ─── Mini componentes ─────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold" style={{ color: color ?? '#0f172a' }}>{value}</p>
      <p className="text-[10px]" style={{ color: '#94a3b8' }}>{label}</p>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, primary }: { icon: string; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      style={primary
        ? { background: 'linear-gradient(135deg,#3b10b5,#601EF9)', color: '#fff' }
        : { background: '#fff', color: '#334155', border: '1.5px solid #ede9fe' }}>
      <span>{icon}</span> {label}
    </button>
  )
}

function PillBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer"
      style={{ background: '#F3EEFF', color: '#601EF9' }}>
      <span>{icon}</span> {label}
    </span>
  )
}

function LegendItem({ color, label, isSquare, isDash }: { color: string; label: string; isSquare?: boolean; isDash?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {isSquare ? <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
       : isDash  ? <div className="w-4 h-0.5 rounded-full" style={{ background: color }} />
       :           <div className="w-3 h-3 rounded-full" style={{ background: color }} />}
      <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>{label}</span>
    </div>
  )
}
