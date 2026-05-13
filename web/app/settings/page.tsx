'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CLINIC_NAME_STORAGE_KEY } from '@/hooks/useClinicName'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'

// ─── Nav sections ─────────────────────────────────────────────────────────────
type Section =
  | 'clinica' | 'horarios' | 'logistica' | 'zonas' | 'servicios'
  | 'whatsapp' | 'qr'
  | 'bot' | 'automatizaciones' | 'notificaciones'
  | 'cuenta'

interface NavItem { id: Section; label: string; icon: string }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Negocio',
    items: [
      { id: 'clinica',    label: 'Clínica',    icon: '🏥' },
      { id: 'horarios',   label: 'Horarios',   icon: '⏰' },
      { id: 'logistica',  label: 'Logística',  icon: '🛵' },
      { id: 'zonas',      label: 'Zonas',      icon: '🗺️' },
      { id: 'servicios',  label: 'Servicios',  icon: '💲' },
    ],
  },
  {
    label: 'Canales',
    items: [
      { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
      { id: 'qr',       label: 'QR & Registro', icon: '📲' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'bot',              label: 'Bot',               icon: '🤖' },
      { id: 'automatizaciones', label: 'Automatizaciones',  icon: '⚡' },
      { id: 'notificaciones',   label: 'Notificaciones',    icon: '🔔' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { id: 'cuenta', label: 'Mi cuenta', icon: '👤' },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [section, setSection] = useState<Section>('clinica')
  const router = useRouter()

  const sectionTitle = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === section)

  return (
    <div className="flex gap-6" style={{ height: 'calc(100vh - 88px)' }}>

      {/* ── Left nav ── */}
      <aside className="w-52 shrink-0 overflow-y-auto">
        <div className="space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1"
                style={{ color: '#94a3b8' }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = section === item.id
                  return (
                    <button key={item.id} onClick={() => setSection(item.id)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative"
                      style={{
                        background: active ? '#F3EEFF' : 'transparent',
                        color:      active ? '#601EF9' : '#334155',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F1F5F9' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5 rounded-r-full"
                          style={{ background: '#601EF9' }} />
                      )}
                      <span>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Divider ── */}
      <div className="w-px shrink-0" style={{ background: '#ede9fe' }} />

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-1 pb-8">
          {/* Section title */}
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>
              {sectionTitle?.icon} {sectionTitle?.label}
            </h2>
          </div>

          {section === 'clinica'        && <TabNegocio />}
          {section === 'horarios'       && <TabHorarios />}
          {section === 'logistica'      && <TabLogistica />}
          {section === 'zonas'          && <TabZonas />}
          {section === 'whatsapp'       && <TabWhatsApp />}
          {section === 'qr'             && <TabQR />}
          {section === 'bot'              && <TabBot />}
          {section === 'automatizaciones' && <RedirectTo href="/automations" />}
          {section === 'notificaciones'   && <TabNotificaciones />}
          {section === 'cuenta'         && <TabCuenta router={router} />}
          {section === 'servicios'      && <TabServicios />}
        </div>
      </main>
    </div>
  )
}

// ─── New sections ────────────────────────────────────────────────────────────

const DISTRITOS_LIMA = [
  'Ancón','Ate','Barranco','Breña','Carabayllo','Chorrillos','Comas',
  'El Agustino','Independencia','Jesús María','La Molina','La Victoria',
  'Lima (Cercado)','Lince','Los Olivos','Lurín','Magdalena del Mar',
  'Miraflores','Pueblo Libre','Puente Piedra','Rímac','San Borja',
  'San Isidro','San Juan de Lurigancho','San Juan de Miraflores','San Luis',
  'San Martín de Porres','San Miguel','Santa Anita','Santiago de Surco',
  'Surquillo','Villa El Salvador','Villa María del Triunfo',
  'Bellavista','Callao','La Perla','Ventanilla',
]

function TabHorarios() {
  const [saved, setSaved] = useState(false)
  const [morning,        setMorning]        = useState(true)
  const [afternoon,      setAfternoon]      = useState(true)
  const [morningStart,   setMorningStart]   = useState('09:00')
  const [morningEnd,     setMorningEnd]     = useState('13:00')
  const [afternoonStart, setAfternoonStart] = useState('14:00')
  const [afternoonEnd,   setAfternoonEnd]   = useState('18:00')
  const [days, setDays] = useState<string[]>(['lun','mar','mié','jue','vie'])

  useEffect(() => {
    api.getMyClinic().then((clinic: unknown) => {
      const c = clinic as { settings?: { horarios?: { morning?: boolean; afternoon?: boolean; days?: string[]; morningStart?: string; morningEnd?: string; afternoonStart?: string; afternoonEnd?: string } } }
      const h = c?.settings?.horarios
      if (h) {
        if (h.morning        !== undefined) setMorning(h.morning)
        if (h.afternoon      !== undefined) setAfternoon(h.afternoon)
        if (h.days)                         setDays(h.days)
        if (h.morningStart)                 setMorningStart(h.morningStart)
        if (h.morningEnd)                   setMorningEnd(h.morningEnd)
        if (h.afternoonStart)               setAfternoonStart(h.afternoonStart)
        if (h.afternoonEnd)                 setAfternoonEnd(h.afternoonEnd)
      }
    }).catch(() => {})
  }, [])

  const DAYS = ['lun','mar','mié','jue','vie','sáb','dom']

  const toggleDay = (d: string) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const save = async () => {
    await api.updateMyClinic({ settings: { horarios: { morning, afternoon, days, morningStart, morningEnd, afternoonStart, afternoonEnd } } }).catch(() => {})
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const TimeInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      type="time" value={value}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className="text-xs px-2 py-1 rounded-lg outline-none"
      style={{ border: '1.5px solid #ddd6fe', background: '#fff', color: '#334155', width: 80 }}
    />
  )

  return (
    <Card title="Horarios operativos" subtitle="Definí en qué franjas y días opera tu clínica.">
      <div className="space-y-5">
        {/* Franjas */}
        <div>
          <label className="text-xs font-semibold mb-3 block" style={{ color: '#334155' }}>
            Franjas horarias disponibles
          </label>
          <div className="space-y-2.5">
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer"
              style={{ background: morning ? '#F3EEFF' : '#F9F9FB', border: `1.5px solid ${morning ? '#a78bfa' : '#E5E7EB'}` }}
              onClick={() => setMorning((v: boolean) => !v)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1" style={{ color: morning ? '#601EF9' : '#334155' }}>
                  Mañana
                </p>
                <div className="flex items-center gap-1.5">
                  <TimeInput value={morningStart} onChange={setMorningStart} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>–</span>
                  <TimeInput value={morningEnd} onChange={setMorningEnd} />
                </div>
              </div>
              <ToggleSwitch value={morning} onChange={setMorning} />
            </div>
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer"
              style={{ background: afternoon ? '#F3EEFF' : '#F9F9FB', border: `1.5px solid ${afternoon ? '#a78bfa' : '#E5E7EB'}` }}
              onClick={() => setAfternoon((v: boolean) => !v)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1" style={{ color: afternoon ? '#601EF9' : '#334155' }}>
                  Tarde
                </p>
                <div className="flex items-center gap-1.5">
                  <TimeInput value={afternoonStart} onChange={setAfternoonStart} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>–</span>
                  <TimeInput value={afternoonEnd} onChange={setAfternoonEnd} />
                </div>
              </div>
              <ToggleSwitch value={afternoon} onChange={setAfternoon} />
            </div>
          </div>
        </div>

        {/* Días */}
        <div>
          <label className="text-xs font-semibold mb-3 block" style={{ color: '#334155' }}>
            Días de operación
          </label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(d => {
              const on = days.includes(d)
              return (
                <button key={d} onClick={() => toggleDay(d)}
                  className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                  style={on
                    ? { background: '#601EF9', color: '#fff' }
                    : { background: '#F9F9FB', color: '#94a3b8', border: '1.5px solid #E5E7EB' }}>
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <SaveBtn onSave={save} saved={saved} />
    </Card>
  )
}

function TimeSlotBlock({
  label, enabled, onEnabled,
  morningOn, onMorningOn, morningStart, onMorningStart, morningEnd, onMorningEnd,
  afternoonOn, onAfternoonOn, afternoonStart, onAfternoonStart, afternoonEnd, onAfternoonEnd,
}: {
  label: string; enabled: boolean; onEnabled: (v: boolean) => void
  morningOn: boolean;   onMorningOn:   (v: boolean) => void
  morningStart: string; onMorningStart:(v: string)  => void
  morningEnd:   string; onMorningEnd:  (v: string)  => void
  afternoonOn: boolean;   onAfternoonOn:   (v: boolean) => void
  afternoonStart: string; onAfternoonStart:(v: string)  => void
  afternoonEnd:   string; onAfternoonEnd:  (v: string)  => void
}) {
  const TI = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input type="time" value={value} onChange={e => onChange(e.target.value)}
      className="rounded-xl px-3 py-2 text-sm focus:outline-none"
      style={{ border: '1.5px solid #e4ebff', background: '#f8faff', color: '#0f172a', width: 120 }} />
  )
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ede9fe' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: enabled ? '#F3EEFF' : '#F9F9FB' }}>
        <div>
          <p className="text-sm font-bold" style={{ color: enabled ? '#601EF9' : '#64748b' }}>{label}</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {enabled ? 'Franjas horarias disponibles para los clientes' : 'Desactivado — los clientes no verán esta opción'}
          </p>
        </div>
        <button type="button" onClick={() => onEnabled(!enabled)}
          className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
          style={{ background: enabled ? '#601EF9' : '#e2e8f0' }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            style={{ left: enabled ? '22px' : '2px' }} />
        </button>
      </div>
      {enabled && (
        <div className="p-4 space-y-2" style={{ background: '#fff' }}>
          {/* Mañana */}
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#F9F9FB', border: '1px solid #e4ebff' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={morningOn} onChange={e => onMorningOn(e.target.checked)}
                className="w-4 h-4 accent-violet-600" />
              <span className="text-sm font-semibold" style={{ color: morningOn ? '#601EF9' : '#94a3b8' }}>Mañana</span>
            </label>
            {morningOn && (
              <div className="flex items-center gap-2">
                <TI value={morningStart} onChange={onMorningStart} />
                <span className="text-xs" style={{ color: '#94a3b8' }}>–</span>
                <TI value={morningEnd} onChange={onMorningEnd} />
              </div>
            )}
          </div>
          {/* Tarde */}
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#F9F9FB', border: '1px solid #e4ebff' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={afternoonOn} onChange={e => onAfternoonOn(e.target.checked)}
                className="w-4 h-4 accent-violet-600" />
              <span className="text-sm font-semibold" style={{ color: afternoonOn ? '#601EF9' : '#94a3b8' }}>Tarde</span>
            </label>
            {afternoonOn && (
              <div className="flex items-center gap-2">
                <TI value={afternoonStart} onChange={onAfternoonStart} />
                <span className="text-xs" style={{ color: '#94a3b8' }}>–</span>
                <TI value={afternoonEnd} onChange={onAfternoonEnd} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TabLogistica() {
  const [saved, setSaved] = useState(false)
  const [maxKm, setMaxKm]       = useState('10')
  const [costPerKm, setCost]    = useState('5')
  const [minOrder, setMinOrder] = useState('0')
  // Recojo (pickup: clinic → client home)
  const [pickupEnabled,        setPickupEnabled]        = useState(false)
  const [pickupMorning,        setPickupMorning]        = useState(true)
  const [pickupAfternoon,      setPickupAfternoon]      = useState(false)
  const [pickupMorningStart,   setPickupMorningStart]   = useState('09:00')
  const [pickupMorningEnd,     setPickupMorningEnd]     = useState('12:00')
  const [pickupAfternoonStart, setPickupAfternoonStart] = useState('14:00')
  const [pickupAfternoonEnd,   setPickupAfternoonEnd]   = useState('18:00')
  // Entrega / regreso (delivery: clinic → client home)
  const [deliveryEnabled,        setDeliveryEnabled]        = useState(false)
  const [deliveryMorning,        setDeliveryMorning]        = useState(false)
  const [deliveryAfternoon,      setDeliveryAfternoon]      = useState(true)
  const [deliveryMorningStart,   setDeliveryMorningStart]   = useState('11:00')
  const [deliveryMorningEnd,     setDeliveryMorningEnd]     = useState('13:00')
  const [deliveryAfternoonStart, setDeliveryAfternoonStart] = useState('15:00')
  const [deliveryAfternoonEnd,   setDeliveryAfternoonEnd]   = useState('19:00')

  useEffect(() => {
    api.getMyClinic().then((clinic: unknown) => {
      const c = clinic as { settings?: { logistica?: Record<string, unknown> } }
      const l = c?.settings?.logistica as Record<string, unknown> | undefined
      if (!l) return
      const s = (k: string, set: (v: string) => void) => { if (typeof l[k] === 'string') set(l[k] as string) }
      const b = (k: string, set: (v: boolean) => void, fallback?: string) => {
        // support old key names (data migration)
        const val = typeof l[k] === 'boolean' ? l[k] : (fallback && typeof l[fallback] === 'boolean' ? l[fallback] : undefined)
        if (val !== undefined) set(val as boolean)
      }
      b('pickupEnabled', setPickupEnabled, 'pickup');  b('pickupMorning', setPickupMorning);   b('pickupAfternoon', setPickupAfternoon)
      s('pickupMorningStart', setPickupMorningStart); s('pickupMorningEnd', setPickupMorningEnd)
      s('pickupAfternoonStart', setPickupAfternoonStart); s('pickupAfternoonEnd', setPickupAfternoonEnd)
      b('deliveryEnabled', setDeliveryEnabled); b('deliveryMorning', setDeliveryMorning); b('deliveryAfternoon', setDeliveryAfternoon)
      s('deliveryMorningStart', setDeliveryMorningStart); s('deliveryMorningEnd', setDeliveryMorningEnd)
      s('deliveryAfternoonStart', setDeliveryAfternoonStart); s('deliveryAfternoonEnd', setDeliveryAfternoonEnd)
      s('maxKm', setMaxKm); s('costPerKm', setCost); s('minOrder', setMinOrder)
    }).catch(() => {})
  }, [])

  const [saveErr, setSaveErr] = useState('')
  const save = async () => {
    setSaveErr('')
    try {
      await api.updateMyClinic({ settings: { logistica: {
        pickupEnabled, pickupMorning, pickupAfternoon,
        pickupMorningStart, pickupMorningEnd, pickupAfternoonStart, pickupAfternoonEnd,
        deliveryEnabled, deliveryMorning, deliveryAfternoon,
        deliveryMorningStart, deliveryMorningEnd, deliveryAfternoonStart, deliveryAfternoonEnd,
        maxKm, costPerKm, minOrder,
      } } })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      const msg = e instanceof Error ? e.message
        : typeof e === 'object' && e !== null && 'message' in e ? String((e as Record<string,unknown>).message)
        : String(e)
      setSaveErr(msg || 'Error al guardar. Revisa la consola.')
    }
  }

  return (
    <Card title="Logística a domicilio" subtitle="Configura si tu clínica ofrece recojo y/o entrega de mascotas.">
      <div className="space-y-4">
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#F3EEFF', color: '#601EF9', border: '1px solid #ddd6fe' }}>
          💡 El bot de WhatsApp usará estos horarios para ofrecer turnos de recojo y entrega a los clientes automáticamente.
        </p>

        <TimeSlotBlock
          label="🛵 Recojo a domicilio"
          enabled={pickupEnabled} onEnabled={setPickupEnabled}
          morningOn={pickupMorning} onMorningOn={setPickupMorning}
          morningStart={pickupMorningStart} onMorningStart={setPickupMorningStart}
          morningEnd={pickupMorningEnd} onMorningEnd={setPickupMorningEnd}
          afternoonOn={pickupAfternoon} onAfternoonOn={setPickupAfternoon}
          afternoonStart={pickupAfternoonStart} onAfternoonStart={setPickupAfternoonStart}
          afternoonEnd={pickupAfternoonEnd} onAfternoonEnd={setPickupAfternoonEnd}
        />

        <TimeSlotBlock
          label="📦 Entrega / regreso a domicilio"
          enabled={deliveryEnabled} onEnabled={setDeliveryEnabled}
          morningOn={deliveryMorning} onMorningOn={setDeliveryMorning}
          morningStart={deliveryMorningStart} onMorningStart={setDeliveryMorningStart}
          morningEnd={deliveryMorningEnd} onMorningEnd={setDeliveryMorningEnd}
          afternoonOn={deliveryAfternoon} onAfternoonOn={setDeliveryAfternoon}
          afternoonStart={deliveryAfternoonStart} onAfternoonStart={setDeliveryAfternoonStart}
          afternoonEnd={deliveryAfternoonEnd} onAfternoonEnd={setDeliveryAfternoonEnd}
        />

        {(pickupEnabled || deliveryEnabled) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <Field label="Distancia máxima (km)" value={maxKm} onChange={setMaxKm} placeholder="Ej: 10" type="number" />
            <Field label="Costo por km (S/)" value={costPerKm} onChange={setCost} placeholder="Ej: 5" type="number" />
            <Field label="Pedido mínimo (S/)" value={minOrder} onChange={setMinOrder} placeholder="0 = sin mínimo" type="number" />
            <div className="flex items-end pb-1">
              <p className="text-xs" style={{ color: '#94a3b8' }}>El costo se suma al total del servicio.</p>
            </div>
          </div>
        )}
      </div>
      {saveErr && <p className="text-xs mt-2 px-3 py-2 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>⚠️ {saveErr}</p>}
      <SaveBtn onSave={save} saved={saved} />
    </Card>
  )
}

function TabZonas() {
  const [saved, setSaved]       = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [q, setQ]               = useState('')

  useEffect(() => {
    api.getMyClinic().then((clinic: unknown) => {
      const c = clinic as { settings?: { zonas?: string[] } }
      if (Array.isArray(c?.settings?.zonas)) setSelected(c.settings!.zonas!)
    }).catch(() => {})
  }, [])

  const filtered = DISTRITOS_LIMA.filter(d => d.toLowerCase().includes(q.toLowerCase()))
  const toggle = (d: string) =>
    setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  const save = async () => {
    await api.updateMyClinic({ settings: { zonas: selected } }).catch(() => {})
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card title="Zonas de operación" subtitle="Seleccioná los distritos donde opera tu clínica. Se usan para asignar rutas.">
      <div className="space-y-3">
        {/* Selected pills */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-3 rounded-xl min-h-[3rem]"
            style={{ background: '#F3EEFF', border: '1px solid #ede9fe' }}>
            {selected.map(d => (
              <button key={d} onClick={() => toggle(d)}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: '#601EF9', color: '#fff' }}>
                {d} <span className="opacity-70">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>🔍</span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar distrito…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
            onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
            onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
          />
        </div>

        {/* District list */}
        <div className="rounded-xl overflow-hidden max-h-56 overflow-y-auto"
          style={{ border: '1.5px solid #E5E7EB' }}>
          {filtered.map((d, i) => {
            const on = selected.includes(d)
            return (
              <button key={d} onClick={() => toggle(d)}
                className="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm transition-colors"
                style={{
                  borderTop: i > 0 ? '1px solid #f1f5f9' : undefined,
                  background: on ? '#F3EEFF' : 'transparent',
                  color: on ? '#601EF9' : '#334155',
                  fontWeight: on ? 600 : 400,
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = '#FAFAFF' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
              >
                {d}
                {on && <span className="text-[11px]">✓</span>}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center py-6 text-sm" style={{ color: '#94a3b8' }}>Sin resultados</p>
          )}
        </div>

        <p className="text-[11px]" style={{ color: '#94a3b8' }}>
          {selected.length} distrito{selected.length !== 1 ? 's' : ''} seleccionado{selected.length !== 1 ? 's' : ''}
        </p>
      </div>
      <SaveBtn onSave={save} saved={saved} />
    </Card>
  )
}

function TabWhatsApp() {
  const [saved, setSaved]     = useState(false)
  const [number, setNumber]   = useState('')
  const [connected] = useState(false) // placeholder — real integration goes here

  return (
    <Card title="WhatsApp Business" subtitle="Conectá tu número para enviar mensajes automáticos a tus clientes.">
      <div className="space-y-5">

        {/* Status badge */}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
          style={{ background: connected ? '#dcfce7' : '#fef9c3', border: `1px solid ${connected ? '#bbf7d0' : '#fde68a'}` }}>
          <span className="text-xl">{connected ? '✅' : '⚠️'}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: connected ? '#16a34a' : '#854d0e' }}>
              {connected ? 'Número conectado' : 'Sin número conectado'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: connected ? '#166534' : '#92400e' }}>
              {connected
                ? 'Los mensajes automáticos se enviarán correctamente'
                : 'Conectá tu número para activar las automatizaciones'}
            </p>
          </div>
        </div>

        {/* Number input */}
        <Field
          label="Número de WhatsApp Business"
          value={number}
          onChange={setNumber}
          placeholder="+51 9XX XXX XXX"
          type="tel"
        />

        {/* How to connect */}
        <div className="px-4 py-4 rounded-xl space-y-3" style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
            Cómo conectar WhatsApp
          </p>
          {[
            'Abrí WhatsApp Business en tu celular',
            'Andá a Configuración → Herramientas para empresas → API',
            'Escaneá el código QR que aparece en pantalla',
            'Tu número quedará vinculado automáticamente',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                style={{ background: '#601EF9' }}>
                {i + 1}
              </span>
              <p className="text-xs" style={{ color: '#64748b' }}>{step}</p>
            </div>
          ))}
        </div>

        <button
          className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: '#25D366', color: '#fff' }}
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}
        >
          <span className="text-lg">💬</span> Conectar WhatsApp Business
        </button>
        {saved && <p className="text-xs text-center" style={{ color: '#10b981' }}>✓ Solicitud enviada</p>}
      </div>
    </Card>
  )
}

// Reusable toggle switch (used in horarios)
function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!value) }}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: value ? '#601EF9' : '#E5E7EB' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

// Redirect helper
function RedirectTo({ href }: { href: string }) {
  useEffect(() => { window.location.href = href }, [href])
  return <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} /></div>
}

// ─── TAB: Datos del negocio ───────────────────────────────────────────────────
function TabNegocio() {
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)
  const [name, setName]       = useState('VetPlace')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm]     = useState({
    address:  '',
    phone:    '',
    email:    '',
    tz:       'America/Lima',
  })

  useEffect(() => {
    api.getMyClinic().then((clinic: unknown) => {
      const c = clinic as { name?: string; phone?: string; address?: string; email?: string; timezone?: string; logo_url?: string; settings?: { logo_url?: string } }
      if (c.name) setName(c.name)
      const logo = c.logo_url ?? c.settings?.logo_url ?? null
      if (logo) setLogoUrl(logo)
      setForm({
        address: c.address  ?? '',
        phone:   c.phone    ?? '',
        email:   c.email    ?? '',
        tz:      c.timezone ?? 'America/Lima',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('El archivo no debe superar 2 MB'); return }
    setUploading(true)
    try {
      // Preview local inmediato
      const reader = new FileReader()
      reader.onload = (ev) => { if (ev.target?.result) setLogoUrl(ev.target.result as string) }
      reader.readAsDataURL(file)
      // Guardar en settings como base64 (no requiere bucket de Storage)
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = (ev) => resolve(ev.target?.result as string)
        r.readAsDataURL(file)
      })
      await api.updateMyClinic({ settings: { logo_url: base64 } }).catch(() => {})
    } finally { setUploading(false) }
  }

  const handleSave = async () => {
    await api.updateMyClinic({
      name:     name.trim() || 'VetPlace',
      phone:    form.phone,
      address:  form.address,
      email:    form.email,
      timezone: form.tz,
    }).catch(() => {})
    // Sync localStorage so the sidebar name updates immediately
    localStorage.setItem(CLINIC_NAME_STORAGE_KEY, name.trim() || 'VetPlace')
    window.dispatchEvent(new Event('storage'))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return (
    <Card title="Datos de la clínica" subtitle="Esta información aparece en el sistema y en las comunicaciones con clientes.">
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} />
      </div>
    </Card>
  )

  return (
    <Card title="Datos de la clínica" subtitle="Esta información aparece en el sistema y en las comunicaciones con clientes.">
      {/* Logo upload */}
      <div className="flex items-center gap-5 mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
          style={{ background: '#F3EEFF', border: '2px dashed #c4b5fd' }}
          onClick={() => logoInputRef.current?.click()}
        >
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            : <Image src="/logo.png" alt="Logo" width={72} height={72} style={{ objectFit: 'contain' }} />
          }
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Logo de la clínica</p>
          <p className="text-xs mt-0.5 mb-2" style={{ color: '#94a3b8' }}>PNG, JPG o SVG · máx. 2 MB</p>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: '#F3EEFF', color: '#601EF9' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ede9fe')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#F3EEFF')}
          >
            {uploading ? 'Subiendo...' : 'Cambiar logo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre de la clínica *" value={name} onChange={setName} placeholder="Ej: Veterinaria San Roque" />
        <Field label="Teléfono principal" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+54 9 11 XXXX-XXXX" />
        <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Av. Javier Prado 1245, San Isidro" />
        <Field label="Email de contacto" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="contacto@mivetrinaria.com" type="email" />
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Zona horaria</label>
          <select
            value={form.tz}
            onChange={(e) => setForm({ ...form, tz: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
          >
            <option value="America/Argentina/Buenos_Aires">Argentina (ART, UTC-3)</option>
            <option value="America/Lima">Perú (PET, UTC-5)</option>
            <option value="America/Bogota">Colombia (COT, UTC-5)</option>
            <option value="America/Mexico_City">México (CST, UTC-6)</option>
            <option value="America/Santiago">Chile (CLT, UTC-3/-4)</option>
          </select>
        </div>
      </div>

      <SaveBtn onSave={() => { void handleSave() }} saved={saved} />
    </Card>
  )
}

// ─── TAB: QR & Registro ──────────────────────────────────────────────────────
function TabQR() {
  const { user } = useAuth()
  const clinicId = user?.user_metadata?.clinic_id as string | undefined
  const [slug, setSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    fetch('/api/clinics/me').then(r => r.json()).then(d => {
      const s = d?.data?.slug ?? d?.slug
      if (s) setSlug(s)
    }).catch(() => {})
  }, [clinicId])

  const appUrl  = typeof window !== 'undefined' ? window.location.origin : 'https://vet-place.vercel.app'
  const portalUrl = slug ? `${appUrl}/p/${slug}` : null
  const qrUrl   = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(portalUrl)}&bgcolor=ffffff&color=3b10b5&qzone=2` : null

  const copyLink = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!clinicId || !slug) {
    return (
      <Card title="QR & Pasaporte de clientes" subtitle="Código QR para que tus clientes accedan a su pasaporte virtual">
        <div className="flex flex-col items-center py-10 gap-3">
          <span className="text-4xl">⏳</span>
          <p className="text-sm text-center" style={{ color: '#64748b' }}>
            {clinicId ? 'Generando tu QR...' : 'Completá los datos del negocio primero.'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card title="QR & Pasaporte de clientes" subtitle="Compartí este QR para que tus clientes accedan a su pasaporte virtual desde su celular.">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* QR */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          {qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="QR pasaporte"
              width={240}
              height={240}
              className="rounded-2xl shadow-md"
              style={{ border: '4px solid #F3EEFF' }}
            />
          )}
          <button
            onClick={() => qrUrl && window.open(qrUrl + '&format=png', '_blank')}
            className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ background: '#F3EEFF', color: '#601EF9' }}
          >
            Descargar QR
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Link del pasaporte</p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#601EF9' }}
              >
                {portalUrl}
              </div>
              <button
                onClick={copyLink}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-colors"
                style={{ background: copied ? '#ecfdf5' : '#F3EEFF', color: copied ? '#10b981' : '#601EF9' }}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold" style={{ color: '#334155' }}>¿Cómo funciona?</p>
            <Step n="1" text="El cliente escanea el QR o recibe el link por WhatsApp" />
            <Step n="2" text="Ingresa su número de celular" />
            <Step n="3" text="Ve su historial, citas y próximos eventos" />
            <Step n="4" text="Puede agendar o consultar directo desde ahí" />
          </div>

          <div
            className="px-4 py-3 rounded-xl text-xs"
            style={{ background: '#F3EEFF', color: '#601EF9' }}
          >
            💡 Imprimí el QR y colocalo en tu recepción, o compartí el link por WhatsApp
          </div>
        </div>
      </div>
    </Card>
  )
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
        style={{ background: '#601EF9' }}
      >
        {n}
      </span>
      <p className="text-xs" style={{ color: '#64748b' }}>{text}</p>
    </div>
  )
}

// ─── TAB: Instrucciones del bot ───────────────────────────────────────────────
const DEFAULT_BOT_INSTRUCTIONS = `Eres el asistente virtual de la clínica veterinaria. Tu función es:\n- Responder consultas sobre turnos, horarios y servicios.\n- Confirmar o cancelar turnos cuando el cliente lo pide.\n- Dar información básica sobre vacunas, baños y consultas.\n- No dar diagnósticos médicos ni indicaciones de medicamentos.\n- Siempre ser amable, claro y conciso.\n- Si no podés resolver algo, derivar al personal de la clínica.\n\nIdioma: español. Tono: profesional pero cercano.`

function TabBot() {
  const [saved, setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [instructions, setInstructions] = useState(DEFAULT_BOT_INSTRUCTIONS)
  const [tone, setTone]           = useState('profesional')
  const [autoReply, setAutoReply] = useState(true)
  const [offHours, setOffHours]   = useState(true)
  const [offMsg, setOffMsg]       = useState('Hola! Estamos fuera del horario de atención. Te respondemos a la brevedad. 🐾')

  useEffect(() => {
    api.getMyClinic().then((c: unknown) => {
      const clinic = c as { settings?: { bot?: Record<string, unknown> } }
      const b = clinic?.settings?.bot
      if (!b) return
      if (typeof b.instructions === 'string') setInstructions(b.instructions)
      if (typeof b.tone         === 'string') setTone(b.tone)
      if (typeof b.autoReply    === 'boolean') setAutoReply(b.autoReply)
      if (typeof b.offHours     === 'boolean') setOffHours(b.offHours)
      if (typeof b.offMsg       === 'string') setOffMsg(b.offMsg)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaveErr('')
    try {
      await api.updateMyClinic({ settings: { bot: { instructions, tone, autoReply, offHours, offMsg } } })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  return (
    <Card title="Instrucciones del bot" subtitle="Configurá cómo responde el asistente de WhatsApp a tus clientes.">
      <div className="space-y-5">
        {/* Prompt principal */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold" style={{ color: '#334155' }}>Instrucciones del sistema (prompt)</label>
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>{instructions.length} caracteres</span>
          </div>
          <textarea
            ref={textRef}
            rows={10}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono leading-relaxed"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
            onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
            onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
          />
          <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
            Este texto se envía como contexto al modelo de IA. Sé específico para mejores respuestas.
          </p>
        </div>

        {/* Tono */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Tono de respuesta</label>
          <div className="flex gap-2 flex-wrap">
            {['profesional', 'amigable', 'formal', 'divertido'].map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors"
                style={
                  tone === t
                    ? { background: '#601EF9', color: '#fff' }
                    : { background: '#F1F5F9', color: '#64748b' }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle auto-reply */}
        <Toggle
          label="Respuesta automática"
          desc="El bot responde automáticamente los mensajes entrantes"
          value={autoReply}
          onChange={setAutoReply}
        />

        {/* Fuera de horario */}
        <Toggle
          label="Mensaje fuera de horario"
          desc="Respuesta automática cuando el cliente escribe fuera del horario de atención"
          value={offHours}
          onChange={setOffHours}
        />
        {offHours && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Mensaje fuera de horario</label>
            <textarea
              rows={2}
              value={offMsg}
              onChange={(e) => setOffMsg(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
              onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
              onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
            />
          </div>
        )}
      </div>

      {saveErr && <p className="text-xs mt-2 px-3 py-2 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626' }}>⚠️ {saveErr}</p>}
      <SaveBtn onSave={handleSave} saved={saved} />
    </Card>
  )
}

// ─── TAB: Automatizaciones ───────────────────────────────────────────────────
function TabAutomatizaciones() {
  return (
    <Card title="Automatizaciones" subtitle="Mensajes automáticos que se envían a tus clientes por WhatsApp según eventos del sistema.">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: '#475569' }}>
          Configura qué mensajes se envían automáticamente al crear una cita, al completarla, antes de una vacuna, y más.
        </p>
        <a href="/automations"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: '#601EF9' }}>
          ⚡ Administrar automatizaciones →
        </a>
      </div>
    </Card>
  )
}

// ─── TAB: Notificaciones ──────────────────────────────────────────────────────
function TabNotificaciones() {
  const [saved, setSaved]             = useState(false)
  const [remindH, setRemindH]         = useState('24')
  const [remindWA, setRemindWA]       = useState(true)
  const [groomingAlert, setGrooming]  = useState(true)
  const [vacunaAlert, setVacuna]      = useState(true)
  const [overdueAlert, setOverdue]    = useState(true)

  return (
    <Card title="Notificaciones" subtitle="Controlá qué alertas se envían y cuándo.">
      <div className="space-y-5">
        <Toggle
          label="Recordatorio de turno por WhatsApp"
          desc="Enviar un mensaje al cliente antes del turno"
          value={remindWA}
          onChange={setRemindWA}
        />
        {remindWA && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>
              Anticipación del recordatorio
            </label>
            <select
              value={remindH}
              onChange={(e) => setRemindH(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
            >
              <option value="2">2 horas antes</option>
              <option value="12">12 horas antes</option>
              <option value="24">24 horas antes</option>
              <option value="48">48 horas antes</option>
            </select>
          </div>
        )}

        <div className="h-px" style={{ background: '#F1F5F9' }} />

        <Toggle
          label="Alerta de grooming próximo"
          desc="Notificar cuando una mascota tiene baño programado"
          value={groomingAlert}
          onChange={setGrooming}
        />
        <Toggle
          label="Alerta de vacunas"
          desc="Notificar cuando una vacuna está por vencer"
          value={vacunaAlert}
          onChange={setVacuna}
        />
        <Toggle
          label="Alerta de eventos vencidos"
          desc="Notificar al staff cuando hay eventos sin completar"
          value={overdueAlert}
          onChange={setOverdue}
        />
      </div>

      <SaveBtn
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}
        saved={saved}
      />
    </Card>
  )
}

// ─── TAB: Cuenta ──────────────────────────────────────────────────────────────
function TabCuenta({ router }: { router: ReturnType<typeof useRouter> }) {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved]   = useState(false)
  const [profileError, setProfileError]   = useState<string | null>(null)

  const meta = user?.user_metadata ?? {}

  const [fullName,  setFullName]  = useState<string>(meta.full_name  ?? '')
  const [clinicName, setClinicName] = useState<string>(meta.clinic_name ?? '')
  const [phone,     setPhone]     = useState<string>(meta.phone      ?? '')
  const [newPass,   setNewPass]   = useState('')
  const [confPass,  setConfPass]  = useState('')

  const handleSaveProfile = async () => {
    setProfileError(null)
    setSavingProfile(true)

    const updates: Record<string, string> = {
      full_name:   fullName.trim(),
      clinic_name: clinicName.trim(),
      phone:       phone.trim(),
    }

    const { error: metaError } = await supabase.auth.updateUser({ data: updates })
    if (metaError) { setProfileError(metaError.message); setSavingProfile(false); return }

    if (clinicName.trim()) {
      localStorage.setItem(CLINIC_NAME_STORAGE_KEY, clinicName.trim())
      window.dispatchEvent(new Event('storage'))
    }

    if (newPass) {
      if (newPass !== confPass) { setProfileError('Las contraseñas no coinciden.'); setSavingProfile(false); return }
      if (newPass.length < 6)  { setProfileError('Mínimo 6 caracteres.'); setSavingProfile(false); return }
      const { error: passError } = await supabase.auth.updateUser({ password: newPass })
      if (passError) { setProfileError(passError.message); setSavingProfile(false); return }
    }

    setProfileSaved(true)
    setSavingProfile(false)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-4">
      {/* Perfil */}
      <Card title="Perfil de administrador" subtitle="Estos datos aparecen en el sistema y en las comunicaciones.">
        {/* Email (solo lectura) */}
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB' }}>
          <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Email</span>
          <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{user?.email ?? '—'}</span>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#ecfdf5', color: '#10b981' }}>Verificado</span>
        </div>

        {profileError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {profileError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre completo"       value={fullName}   onChange={setFullName}   placeholder="Tu nombre" />
          <Field label="Nombre de la clínica"  value={clinicName} onChange={setClinicName} placeholder="Veterinaria San Roque" />
          <Field label="Teléfono"              value={phone}      onChange={setPhone}      placeholder="+54 9 11 XXXX-XXXX" type="tel" />
          <div /> {/* spacer */}
          <Field label="Nueva contraseña"      value={newPass}    onChange={setNewPass}    placeholder="Dejar vacío para no cambiar" type="password" />
          <Field label="Confirmar contraseña"  value={confPass}   onChange={setConfPass}   placeholder="Repetí la contraseña" type="password" />
        </div>
        <SaveBtn onSave={handleSaveProfile} saved={profileSaved} loading={savingProfile} label="Guardar perfil" />
      </Card>

      {/* Plan */}
      <Card title="Plan actual" subtitle="">
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: '#F3EEFF', border: '1px solid #ede9fe' }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: '#601EF9' }}>Plan Free</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Hasta 50 clientes · 1 usuario</p>
          </div>
          <button
            className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3b10b5, #601EF9)' }}
          >
            Mejorar plan
          </button>
        </div>
      </Card>

      {/* Zona peligrosa */}
      <Card title="Zona de peligro" subtitle="Acciones irreversibles para la cuenta.">
        <div className="space-y-3">

          {/* Cerrar sesión */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Cerrar sesión</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Salir de tu cuenta en este dispositivo</p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#dc2626', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
            >
              Cerrar sesión
            </button>
          </div>

          {/* Eliminar cuenta */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: '#fff', border: '1px solid #fecaca' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Eliminar cuenta</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Borra todos los datos permanentemente</p>
            </div>
            <button
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </Card>

      {/* Confirm modal logout */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <p className="text-base font-bold mb-1" style={{ color: '#0f172a' }}>¿Cerrar sesión?</p>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>Serás redirigido a la pantalla de inicio.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F1F5F9', color: '#334155' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#dc2626' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
        onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
        onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
      />
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
        style={{ background: value ? '#601EF9' : '#E5E7EB' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function SaveBtn({ onSave, saved, loading = false, label = 'Guardar cambios' }: {
  onSave: () => void; saved: boolean; loading?: boolean; label?: string
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
        style={{ background: 'linear-gradient(135deg, #3b10b5, #601EF9)', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Guardando…' : label}
      </button>
      {saved && (
        <span className="text-xs font-medium" style={{ color: '#10b981' }}>✓ Guardado</span>
      )}
    </div>
  )
}

// ─── Tab: Servicios y Precios ─────────────────────────────────────────────────
interface ServiceType {
  id: string; name: string; price: number | null; active: boolean; sort_order: number
}
function TabServicios() {
  const [services, setServices] = useState<ServiceType[]>([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [newName, setNewName]   = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    try {
      const data = await api.getServiceTypes() as ServiceType[]
      setServices(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const svc = await api.createServiceType({
        name:  newName.trim(),
        price: newPrice ? parseFloat(newPrice) : null,
      }) as ServiceType
      setServices(prev => [...prev, svc])
      setNewName(''); setNewPrice(''); setAdding(false)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const toggleActive = async (svc: ServiceType) => {
    try {
      await api.updateServiceType(svc.id, { active: !svc.active })
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, active: !s.active } : s))
    } catch { /* silent */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este servicio?')) return
    try {
      await api.deleteServiceType(id)
      setServices(prev => prev.filter(s => s.id !== id))
    } catch { /* silent */ }
  }

  const updatePrice = async (svc: ServiceType, val: string) => {
    const price = val === '' ? null : parseFloat(val)
    if (val !== '' && isNaN(price!)) return
    try {
      await api.updateServiceType(svc.id, { price })
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, price } : s))
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#64748b' }}>
        Configurá los servicios que ofrecés con sus precios. Al completar un servicio en la agenda,
        el precio se pre-cargará automáticamente según la mascota o el tipo de servicio.
      </p>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #ede9fe' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ background: '#F9F7FF', borderBottom: '1px solid #ede9fe' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#601EF9' }}>
            Catálogo de servicios
          </p>
          <button onClick={() => setAdding(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: '#601EF9' }}>
            + Agregar
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />)}
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {services.length === 0 && !adding && (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">💲</span>
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Sin servicios configurados</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Agregá tus servicios para pre-cargar precios al cobrar</p>
              </div>
            )}
            {services.map(svc => (
              <div key={svc.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: svc.active ? '#22c55e' : '#cbd5e1' }} />
                <p className="flex-1 text-sm font-semibold" style={{ color: svc.active ? '#0f172a' : '#94a3b8' }}>
                  {svc.name}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: '#64748b' }}>S/</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={svc.price ?? ''}
                    placeholder="—"
                    onBlur={e => updatePrice(svc, e.target.value)}
                    className="w-20 px-2 py-1 text-sm font-bold rounded-lg text-right outline-none"
                    style={{ border: '1px solid #e2e8f0', color: '#0f172a' }}
                  />
                </div>
                <button onClick={() => toggleActive(svc)}
                  className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                  style={{ background: svc.active ? '#f0fdf4' : '#f8fafc', color: svc.active ? '#16a34a' : '#94a3b8' }}>
                  {svc.active ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => handleDelete(svc.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {adding && (
              <form onSubmit={handleAdd} className="flex items-center gap-2 px-4 py-3">
                <input autoFocus type="text" placeholder="Nombre del servicio"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl outline-none"
                  style={{ border: '1.5px solid #601EF9', color: '#0f172a' }} />
                <span className="text-xs" style={{ color: '#64748b' }}>S/</span>
                <input type="number" step="0.01" placeholder="Precio"
                  value={newPrice} onChange={e => setNewPrice(e.target.value)}
                  className="w-24 px-2 py-2 text-sm rounded-xl outline-none text-right"
                  style={{ border: '1px solid #e2e8f0' }} />
                <button type="submit" disabled={saving}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-white disabled:opacity-50"
                  style={{ background: '#601EF9' }}>
                  {saving ? '...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setAdding(false); setNewName(''); setNewPrice('') }}
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{ background: '#F1F5F9', color: '#64748b' }}>
                  Cancelar
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
          Tip: Para precios por mascota (ej. bano de Golden vs Chihuahua), podes editar el precio
          default directamente en el perfil de cada mascota.
        </p>
      </div>
    </div>
  )
}

