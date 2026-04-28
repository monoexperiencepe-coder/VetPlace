'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type RouteStatus = 'pending' | 'on_route' | 'completed'
type StopStatus  = 'pending' | 'completed'

interface Stop {
  order:    number
  client:   string
  pet:      string
  petEmoji: string
  district: string
  address:  string
  time:     string
  status:   StopStatus
  notes?:   string
}

interface Route {
  id:        string
  name:      string
  timeRange: string
  status:    RouteStatus
  stops:     Stop[]
  distanceKm?: number
  durationMin?: number
}

type DateFilter = 'today' | 'tomorrow' | 'custom'

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ROUTES: Route[] = [
  {
    id: 'r1',
    name: 'Ruta Norte – Mañana',
    timeRange: '09:00 – 12:30',
    status: 'on_route',
    distanceKm: 18.4,
    durationMin: 95,
    stops: [
      { order: 1, client: 'Lucía Fernández', pet: 'Luna',  petEmoji: '🐕', district: 'Palermo',     address: 'Thames 1234',       time: '09:15', status: 'completed' },
      { order: 2, client: 'Marcos Rodríguez', pet: 'Thor', petEmoji: '🐕', district: 'Belgrano',    address: 'Mendoza 2567',      time: '10:00', status: 'completed' },
      { order: 3, client: 'Ana Gómez',        pet: 'Coco', petEmoji: '🐕', district: 'Colegiales',  address: 'Av. Elcano 3410',   time: '10:45', status: 'pending', notes: 'Timbre roto – llamar al llegar' },
      { order: 4, client: 'Carlos Suárez',    pet: 'Rex',  petEmoji: '🐕', district: 'Villa Urquiza', address: 'Galván 890',      time: '11:30', status: 'pending' },
    ],
  },
  {
    id: 'r2',
    name: 'Ruta Sur – Tarde',
    timeRange: '14:00 – 17:00',
    status: 'pending',
    distanceKm: 12.1,
    durationMin: 70,
    stops: [
      { order: 1, client: 'Marta López',     pet: 'Simba', petEmoji: '🐱', district: 'Almagro',     address: 'Av. Corrientes 4120', time: '14:15', status: 'pending' },
      { order: 2, client: 'Pedro Herrera',   pet: 'Rocky', petEmoji: '🐕', district: 'Boedo',       address: 'Sánchez de Loria 567', time: '15:00', status: 'pending' },
      { order: 3, client: 'Sofía Méndez',    pet: 'Mochi', petEmoji: '🐱', district: 'Caballito',   address: 'Rivadavia 5890',      time: '15:45', status: 'pending', notes: 'Pedir que bajen al perro' },
    ],
  },
]

const CLINIC = { name: 'Clínica VetPlace', address: 'Av. Santa Fe 2345, CABA' }

const STATUS_STYLES: Record<RouteStatus, { label: string; bg: string; color: string; dot: string }> = {
  pending:   { label: 'Pendiente', bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  on_route:  { label: 'En ruta',   bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  completed: { label: 'Completada', bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RoutesPage() {
  const [routes, setRoutes]           = useState<Route[]>(MOCK_ROUTES)
  const [selectedId, setSelectedId]   = useState<string>(MOCK_ROUTES[0].id)
  const [dateFilter, setDateFilter]   = useState<DateFilter>('today')
  const [customDate, setCustomDate]   = useState('')

  const selected = routes.find(r => r.id === selectedId)!
  const totalStops = routes.reduce((s, r) => s + r.stops.length, 0)
  const completedStops = routes.flatMap(r => r.stops).filter(s => s.status === 'completed').length

  const toggleStop = (routeId: string, order: number) => {
    setRoutes(prev => prev.map(r =>
      r.id !== routeId ? r : {
        ...r,
        stops: r.stops.map(s =>
          s.order !== order ? s : { ...s, status: s.status === 'completed' ? 'pending' : 'completed' }
        ),
      }
    ))
  }

  const setRouteStatus = (id: string, status: RouteStatus) =>
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, status } : r))

  const mapsUrl = (r: Route) => {
    const stops = r.stops.map(s => encodeURIComponent(s.address)).join('/')
    return `https://www.google.com/maps/dir/${encodeURIComponent(CLINIC.address)}/${stops}/${encodeURIComponent(CLINIC.address)}`
  }

  const waText = (r: Route) => encodeURIComponent(
    `🛵 *${r.name}* (${r.timeRange})\n` +
    `📍 Inicio: ${CLINIC.name}\n` +
    r.stops.map(s => `${s.order}. ${s.time} · ${s.client} (${s.pet}) · ${s.district}`).join('\n') +
    `\n📍 Retorno: ${CLINIC.name}`
  )

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-88px)]">

      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        {/* Selector de fecha */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl gap-1" style={{ background: '#F3EEFF' }}>
            {(['today', 'tomorrow', 'custom'] as DateFilter[]).map(f => (
              <button key={f} onClick={() => setDateFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={dateFilter === f
                  ? { background: '#601EF9', color: '#fff' }
                  : { color: '#601EF9' }}
              >
                {f === 'today' ? 'Hoy' : f === 'tomorrow' ? 'Mañana' : 'Fecha'}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl outline-none"
              style={{ background: '#fff', border: '1.5px solid #ede9fe', color: '#0f172a' }}
            />
          )}
        </div>

        {/* Resumen + acciones */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-4 py-2 rounded-xl"
            style={{ background: '#fff', border: '1px solid #ede9fe' }}>
            <Stat label="Rutas" value={String(routes.length)} />
            <div style={{ width: 1, height: 24, background: '#ede9fe' }} />
            <Stat label="Servicios" value={String(totalStops)} />
            <div style={{ width: 1, height: 24, background: '#ede9fe' }} />
            <Stat label="Completados" value={`${completedStops}/${totalStops}`} color="#10b981" />
          </div>
          <ActionBtn icon="⚡" label="Optimizar" primary onClick={() => {}} />
          <ActionBtn icon="🔄" label="Recalcular" onClick={() => {}} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          LAYOUT 2 COLUMNAS
      ══════════════════════════════════════════════════════ */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="w-[420px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">

          {/* A. Lista de rutas */}
          <div className="space-y-2">
            {routes.map(r => {
              const st  = STATUS_STYLES[r.status]
              const done = r.stops.filter(s => s.status === 'completed').length
              const isSelected = r.id === selectedId
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)}
                  className="w-full text-left rounded-2xl p-4 transition-all"
                  style={{
                    background: isSelected ? '#F3EEFF' : '#fff',
                    border: isSelected ? '2px solid #601EF9' : '1.5px solid #ede9fe',
                    boxShadow: isSelected ? '0 0 0 3px rgba(96,30,249,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{r.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>🕐 {r.timeRange}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
                      style={{ background: st.bg, color: st.color }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.dot }} />
                      {st.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${r.stops.length ? (done / r.stops.length) * 100 : 0}%`, background: '#601EF9' }} />
                    </div>
                    <span className="text-[11px] font-semibold shrink-0" style={{ color: '#601EF9' }}>
                      {done}/{r.stops.length} paradas
                    </span>
                  </div>

                  {/* Métricas de ruta */}
                  {(r.distanceKm || r.durationMin) && (
                    <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: '1px solid #ede9fe' }}>
                      {r.distanceKm && <span className="text-[11px]" style={{ color: '#94a3b8' }}>📏 {r.distanceKm} km</span>}
                      {r.durationMin && <span className="text-[11px]" style={{ color: '#94a3b8' }}>⏱️ ~{r.durationMin} min</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* B. Detalle de la ruta seleccionada */}
          <div className="rounded-2xl overflow-hidden flex-1"
            style={{ background: '#fff', border: '1.5px solid #ede9fe' }}>

            {/* Header del detalle */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#F3EEFF,#ede9fe)', borderBottom: '1px solid #ddd6fe' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: '#3b10b5' }}>{selected.name}</p>
                <p className="text-xs" style={{ color: '#7c3aed' }}>{selected.timeRange}</p>
              </div>
              <div className="text-right">
                {selected.distanceKm && <p className="text-xs font-semibold" style={{ color: '#601EF9' }}>{selected.distanceKm} km</p>}
                {selected.durationMin && <p className="text-[11px]" style={{ color: '#7c3aed' }}>~{selected.durationMin} min</p>}
              </div>
            </div>

            {/* Lista de paradas */}
            <div className="px-4 pt-3 pb-2 overflow-y-auto" style={{ maxHeight: 380 }}>
              {/* Origen */}
              <ClinicStop label={CLINIC.name} sub={CLINIC.address} isOrigin />

              {selected.stops.map((s, i) => (
                <StopRow key={s.order} stop={s} isLast={i === selected.stops.length - 1}
                  onToggle={() => toggleStop(selected.id, s.order)} />
              ))}

              {/* Retorno */}
              <ClinicStop label={CLINIC.name} sub={CLINIC.address} />
            </div>

            {/* C. Acciones de ruta */}
            <div className="px-4 pb-4 pt-2 space-y-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <div className="flex flex-wrap gap-2">
                <a href={mapsUrl(selected)} target="_blank" rel="noopener noreferrer">
                  <PillBtn icon="🗺️" label="Google Maps" />
                </a>
                <a href={`https://wa.me/?text=${waText(selected)}`} target="_blank" rel="noopener noreferrer">
                  <PillBtn icon="💬" label="Enviar por WhatsApp" />
                </a>
              </div>
              <div className="flex gap-2">
                {selected.status === 'pending' && (
                  <button onClick={() => setRouteStatus(selected.id, 'on_route')}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition"
                    style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
                    🛵 Iniciar ruta
                  </button>
                )}
                {selected.status === 'on_route' && (
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

        {/* ── COLUMNA DERECHA: Mapa ── */}
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: '#fff', border: '1.5px solid #ede9fe', minHeight: 0 }}>

          {/* Map header */}
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
            <a href={mapsUrl(selected)} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1"
              style={{ background: '#F3EEFF', color: '#601EF9' }}>
              Abrir en Maps →
            </a>
          </div>

          {/* Mapa visual SVG */}
          <div className="flex-1 relative overflow-hidden" style={{ background: '#f8f8fc', minHeight: 0 }}>
            <RouteMapVisual stops={selected.stops} clinicName={CLINIC.name} />
          </div>

          {/* Leyenda */}
          <div className="px-4 py-3 flex items-center gap-4 flex-wrap shrink-0"
            style={{ borderTop: '1px solid #f1f5f9' }}>
            <LegendItem color="#601EF9" label="Clínica (origen/retorno)" isSquare />
            <LegendItem color="#601EF9" label="Parada pendiente" />
            <LegendItem color="#10b981" label="Parada completada" />
            <LegendItem color="#f59e0b" label="Parada con nota" isDash />
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Componente: Mapa visual ──────────────────────────────────────────────────
function RouteMapVisual({ stops, clinicName }: { stops: Stop[]; clinicName: string }) {
  const W = 800; const H = 500
  const pad = 60

  // Layout en zigzag para simular una ruta real
  const positions: { x: number; y: number }[] = stops.map((_, i) => {
    const cols = 3
    const col  = i % cols
    const row  = Math.floor(i / cols)
    const xStep = (W - pad * 2) / (cols - 1 || 1)
    const yStep = (H - pad * 2 - 80) / (Math.ceil(stops.length / cols) || 1)
    return {
      x: pad + col * xStep,
      y: pad + 80 + row * yStep + (col % 2 === 1 ? yStep / 2 : 0),
    }
  })

  const clinicStart = { x: pad,     y: pad + 30 }
  const clinicEnd   = { x: W - pad, y: H - pad  }

  const allPoints = [clinicStart, ...positions, clinicEnd]

  const pathD = allPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '100%' }}>
        {/* Fondo de mapa simulado */}
        <rect x="0" y="0" width={W} height={H} fill="#f8f8fc" rx="8" />

        {/* Grid sutil */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * H / 7} x2={W} y2={i * H / 7}
            stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={i * W / 11} y1={0} x2={i * W / 11} y2={H}
            stroke="#e2e8f0" strokeWidth="1" />
        ))}

        {/* Línea de ruta */}
        <path d={pathD} fill="none" stroke="#ddd6fe" strokeWidth="3" strokeDasharray="8 4" />
        <path d={pathD} fill="none" stroke="#601EF9" strokeWidth="2.5"
          strokeDasharray="8 4" opacity="0.7" />

        {/* Clínica origen */}
        <g>
          <rect x={clinicStart.x - 20} y={clinicStart.y - 16} width={40} height={32} rx={8}
            fill="#601EF9" />
          <text x={clinicStart.x} y={clinicStart.y + 5} textAnchor="middle" fontSize="14" fill="white">🏥</text>
          <text x={clinicStart.x} y={clinicStart.y + 28} textAnchor="middle" fontSize="9"
            fill="#601EF9" fontWeight="600">
            {clinicName.slice(0, 12)}
          </text>
        </g>

        {/* Paradas */}
        {stops.map((s, i) => {
          const p = positions[i]
          if (!p) return null
          const done = s.status === 'completed'
          return (
            <g key={s.order}>
              {/* Sombra */}
              <circle cx={p.x} cy={p.y + 2} r={16} fill="rgba(0,0,0,0.08)" />
              {/* Círculo */}
              <circle cx={p.x} cy={p.y} r={16}
                fill={done ? '#10b981' : '#601EF9'} />
              {/* Número */}
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="11"
                fill="white" fontWeight="bold">
                {s.order}
              </text>
              {/* Label */}
              <rect x={p.x - 38} y={p.y + 22} width={76} height={28} rx={6}
                fill="white" stroke={done ? '#bbf7d0' : '#ddd6fe'} strokeWidth="1.5" />
              <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="8.5"
                fill="#0f172a" fontWeight="600">
                {s.client.split(' ')[0]}
              </text>
              <text x={p.x} y={p.y + 44} textAnchor="middle" fontSize="8"
                fill="#94a3b8">
                {s.time} · {s.district}
              </text>
              {/* Nota indicator */}
              {s.notes && (
                <circle cx={p.x + 14} cy={p.y - 12} r={5} fill="#f59e0b" />
              )}
              {/* Check si completado */}
              {done && (
                <text x={p.x + 12} y={p.y - 8} fontSize="10" fill="#10b981">✓</text>
              )}
            </g>
          )
        })}

        {/* Clínica retorno */}
        <g>
          <rect x={clinicEnd.x - 20} y={clinicEnd.y - 16} width={40} height={32} rx={8}
            fill="#3b10b5" />
          <text x={clinicEnd.x} y={clinicEnd.y + 5} textAnchor="middle" fontSize="14" fill="white">🏥</text>
          <text x={clinicEnd.x} y={clinicEnd.y + 28} textAnchor="middle" fontSize="9"
            fill="#3b10b5" fontWeight="600">
            Retorno
          </text>
        </g>
      </svg>
    </div>
  )
}

// ─── Componente: Parada en la lista ──────────────────────────────────────────
function StopRow({ stop, isLast, onToggle }: { stop: Stop; isLast: boolean; onToggle: () => void }) {
  const done = stop.status === 'completed'
  return (
    <div className="flex items-start gap-3 py-1">
      {/* Conector vertical */}
      <div className="flex flex-col items-center shrink-0 mt-1" style={{ width: 28 }}>
        <button onClick={onToggle}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
          style={done
            ? { background: '#10b981', color: '#fff' }
            : { background: '#F3EEFF', color: '#601EF9', border: '2px solid #ddd6fe' }}
        >
          {done ? '✓' : stop.order}
        </button>
        {!isLast && <div className="w-0.5 flex-1 mt-0.5 min-h-[20px]" style={{ background: '#ede9fe' }} />}
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: done ? '#94a3b8' : '#0f172a', textDecoration: done ? 'line-through' : 'none' }}>
              {stop.petEmoji} {stop.pet} · {stop.client}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>
              📍 {stop.district} · {stop.address}
            </p>
            {stop.notes && (
              <p className="text-[11px] mt-1 px-2 py-0.5 rounded-lg inline-block"
                style={{ background: '#fffbeb', color: '#d97706' }}>
                ⚠️ {stop.notes}
              </p>
            )}
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: done ? '#94a3b8' : '#601EF9' }}>
            {stop.time}
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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: '#601EF9' }}>
          🏥
        </div>
        {isOrigin && <div className="w-0.5 min-h-[20px] mt-0.5" style={{ background: '#ede9fe' }} />}
      </div>
      <div className="flex-1 pb-3">
        <p className="text-sm font-bold" style={{ color: '#601EF9' }}>
          {label} {isOrigin ? '(Origen)' : '(Retorno)'}
        </p>
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

function ActionBtn({ icon, label, onClick, primary }: {
  icon: string; label: string; onClick: () => void; primary?: boolean
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      style={primary
        ? { background: 'linear-gradient(135deg,#3b10b5,#601EF9)', color: '#fff' }
        : { background: '#fff', color: '#334155', border: '1.5px solid #ede9fe' }}
      onMouseEnter={e => { if (!primary) e.currentTarget.style.background = '#F3EEFF' }}
      onMouseLeave={e => { if (!primary) e.currentTarget.style.background = '#fff' }}
    >
      <span>{icon}</span> {label}
    </button>
  )
}

function PillBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
      style={{ background: '#F3EEFF', color: '#601EF9' }}>
      <span>{icon}</span> {label}
    </span>
  )
}

function LegendItem({ color, label, isSquare, isDash }: { color: string; label: string; isSquare?: boolean; isDash?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {isSquare
        ? <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
        : isDash
        ? <div className="w-4 h-0.5 rounded-full" style={{ background: color, borderTop: `2px dashed ${color}` }} />
        : <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      }
      <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>{label}</span>
    </div>
  )
}
