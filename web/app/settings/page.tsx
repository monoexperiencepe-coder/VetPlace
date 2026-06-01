'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CLINIC_NAME_STORAGE_KEY } from '@/hooks/useClinicName'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'
import { api, type AutomationRecord } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

// ─── Nav sections ─────────────────────────────────────────────────────────────
type Section =
  | 'clinica' | 'horarios' | 'logistica' | 'zonas' | 'servicios'
  | 'whatsapp' | 'qr'
  | 'bot' | 'automatizaciones' | 'notificaciones'
  | 'cuenta' | 'equipo'

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
      { id: 'cuenta',  label: 'Mi cuenta', icon: '👤' },
      { id: 'equipo',  label: 'Equipo',    icon: '👥' },
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
          {section === 'automatizaciones' && <TabAutomatizaciones />}
          {section === 'notificaciones'   && <TabNotificaciones />}
          {section === 'cuenta'         && <TabCuenta router={router} />}
          {section === 'equipo'         && <TabEquipo />}
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

// ─── TAB: Bot — "Configuración mínima" ────────────────────────────────────────

function buildBotPrompt(opts: {
  clinicName: string
  assistantName: string
  communicationStyle: string
  useEmojis: boolean
  responseLength: string
  welcomeMessage: string
  allowBookings: boolean
  allowReschedule: boolean
  allowCancellations: boolean
  sharePrice: boolean
  shareLocation: boolean
  shareZones: boolean
  escalateToHuman: boolean
  escalationContact: string
  cancelPolicy: string
  cancelHours: string
  noShowPolicy: string
  paymentMethods: string[]
  offHoursMessage: string
  confirmationMessage: string
  reminderMessage: string
  objectives: string[]
  extraInstructions: string
}): string {
  const styleMap: Record<string, string> = {
    friendly:     'cercano, cálido y amigable',
    professional: 'profesional y cortés',
    premium:      'sofisticado, exclusivo y premium',
    fun:          'divertido, dinámico y con humor ligero',
  }
  const lengthMap: Record<string, string> = {
    brief:    'Responde siempre de forma breve (1-2 líneas máximo).',
    balanced: 'Usa respuestas equilibradas, ni muy cortas ni muy largas.',
    detailed: 'Puedes dar respuestas detalladas cuando el cliente necesite más información.',
  }
  const cancelMap: Record<string, string> = {
    free:   'Las cancelaciones son gratuitas en cualquier momento.',
    notice: `Se requiere avisar con al menos ${opts.cancelHours} horas de anticipación para cancelar sin cargo.`,
    charge: 'Las cancelaciones de último momento pueden tener un cargo por reserva.',
  }
  const objLabels: Record<string, string> = {
    more_bookings:  'conseguir más reservas',
    recurrence:     'aumentar la recurrencia de clientes',
    reactivate:     'recuperar clientes inactivos',
    reduce_cancel:  'reducir cancelaciones',
    better_service: 'mejorar la experiencia de atención',
    premium_upsell: 'incrementar ventas de servicios premium',
    products:       'vender productos complementarios',
    avg_ticket:     'aumentar el ticket promedio',
    loyalty:        'fidelizar clientes',
  }

  const name   = opts.assistantName || 'el asistente virtual'
  const clinic = opts.clinicName || 'la clínica'
  const style  = styleMap[opts.communicationStyle] || styleMap.friendly
  const length = lengthMap[opts.responseLength] || lengthMap.balanced
  const emojis = opts.useEmojis ? 'Puedes usar emojis de forma moderada.' : 'No uses emojis.'
  const cancel = cancelMap[opts.cancelPolicy] || cancelMap.notice

  const lines: string[] = [
    `Eres ${name}, el asistente virtual de ${clinic}.`,
    ``,
    `ACCESO AL SISTEMA:`,
    `Tienes acceso completo a la información del negocio registrada en el sistema:`,
    `- Servicios disponibles y precios actualizados`,
    `- Horarios de atención configurados`,
    `- Agenda y disponibilidad en tiempo real`,
    `- Zonas de cobertura y logística`,
    `- Información de mascotas y clientes registrados`,
    `- Personal asignado y su disponibilidad`,
    ``,
    `CONFIDENCIALIDAD:`,
    `Nunca reveles información interna del negocio: ventas, facturación, costos, sueldos, comisiones, estadísticas administrativas ni configuraciones internas. Si un cliente pregunta algo de esto, indica que no estás autorizado a compartir esa información.`,
    ``,
    `PERSONALIDAD:`,
    `- Estilo: ${style}.`,
    `- ${length}`,
    `- ${emojis}`,
    `- Idioma: español. Tutea al cliente.`,
  ]

  if (opts.welcomeMessage) lines.push(`- Saludo de bienvenida: "${opts.welcomeMessage}"`)

  lines.push(``, `REGLAS DE ATENCIÓN:`)
  lines.push(`- ${opts.allowBookings      ? 'Puedes agendar citas directamente.' : 'No agendes citas. Derivá al cliente para que contacte al negocio.'}`)
  lines.push(`- ${opts.allowReschedule    ? 'Puedes reprogramar citas existentes.' : 'No reprogrames citas. Derivá al equipo.'}`)
  lines.push(`- ${opts.allowCancellations ? 'Puedes cancelar citas cuando el cliente lo solicita.' : 'No canceles citas directamente. Derivá al equipo.'}`)
  lines.push(`- ${opts.sharePrice         ? 'Comparte precios de servicios cuando el cliente pregunta.' : 'No des precios exactos. Indica que varían según la mascota y derivá para consulta.'}`)
  if (opts.shareLocation)  lines.push(`- Comparte la dirección y ubicación del negocio cuando te la pidan.`)
  if (opts.shareZones)     lines.push(`- Informa sobre las zonas de cobertura del servicio a domicilio.`)
  if (opts.escalateToHuman) {
    const contact = opts.escalationContact ? `Contacto: ${opts.escalationContact}.` : ''
    lines.push(`- Cuando no puedas resolver algo o la situación lo requiera, deriva al equipo humano. ${contact}`)
  }

  lines.push(``, `POLÍTICAS:`)
  lines.push(`- Cancelaciones: ${cancel}`)
  if (opts.noShowPolicy)   lines.push(`- No-show: ${opts.noShowPolicy}`)
  if (opts.paymentMethods.length > 0) lines.push(`- Métodos de pago aceptados: ${opts.paymentMethods.join(', ')}.`)

  if (opts.offHoursMessage)     lines.push(``, `FUERA DE HORARIO:`, `Cuando el cliente escribe fuera del horario, responde: "${opts.offHoursMessage}"`)
  if (opts.confirmationMessage) lines.push(``, `CONFIRMACIÓN DE RESERVA:`, `Al confirmar una cita, envía: "${opts.confirmationMessage}"`)
  if (opts.reminderMessage)     lines.push(``, `RECORDATORIO:`, `Para recordatorios de citas, usa: "${opts.reminderMessage}"`)

  if (opts.objectives.length > 0) {
    const objText = opts.objectives.map(o => objLabels[o] || o).join(', ')
    lines.push(``, `OBJETIVOS COMERCIALES:`, `El negocio busca: ${objText}.`)
    lines.push(`Orienta sutilmente tus respuestas para apoyar estos objetivos cuando sea natural y oportuno. No seas agresivo ni invasivo.`)
  }

  if (opts.extraInstructions) lines.push(``, `INSTRUCCIONES ADICIONALES:`, opts.extraInstructions)

  return lines.join('\n')
}

// Compact toggle for the bot page
function BotToggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: value ? '#F3EEFF' : '#f8fafc', border: `1.5px solid ${value ? '#ddd6fe' : '#e2e8f0'}`, transition: 'all 0.15s' }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: value ? '#3b0764' : '#334155', margin: 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{desc}</p>}
      </div>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: value ? '#601EF9' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: value ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  )
}

function BotBlock({ n, title, desc, children }: { n: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #ede9fe', borderRadius: 16, overflow: 'hidden', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#3b10b5,#601EF9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>{n}</div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '1px 0 0' }}>{desc}</p>
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function BotInput({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const base: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#f9f9fb', outline: 'none', boxSizing: 'border-box' }
  return (
    <div style={{ marginTop: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>}
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...base, resize: 'none', lineHeight: 1.5 }}
            onFocus={e => (e.currentTarget.style.borderColor = '#601EF9')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#e2e8f0')} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base}
            onFocus={e => (e.currentTarget.style.borderColor = '#601EF9')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#e2e8f0')} />
      }
    </div>
  )
}

function BotPillSelect({ options, value, onChange, multi }: { options: { id: string; label: string }[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean }) {
  const isSelected = (id: string) => multi ? (value as string[]).includes(id) : value === id
  const toggle = (id: string) => {
    if (multi) {
      const arr = value as string[]
      onChange(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])
    } else {
      onChange(id)
    }
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => toggle(o.id)}
          style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
            borderColor: isSelected(o.id) ? '#601EF9' : '#e2e8f0',
            background:  isSelected(o.id) ? '#601EF9' : 'white',
            color:       isSelected(o.id) ? 'white'   : '#475569' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TabBot() {
  const [saved, setSaved]     = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [clinicName, setClinicName] = useState('')

  // Block 1 — Personalidad
  const [assistantName,      setAssistantName]      = useState('Vety')
  const [communicationStyle, setCommunicationStyle] = useState('friendly')
  const [useEmojis,          setUseEmojis]          = useState(true)
  const [responseLength,     setResponseLength]     = useState('balanced')
  const [welcomeMessage,     setWelcomeMessage]     = useState('')

  // Block 2 — Reglas de atención
  const [allowBookings,      setAllowBookings]      = useState(true)
  const [allowReschedule,    setAllowReschedule]    = useState(true)
  const [allowCancellations, setAllowCancellations] = useState(true)
  const [sharePrice,         setSharePrice]         = useState(true)
  const [shareLocation,      setShareLocation]      = useState(true)
  const [shareZones,         setShareZones]         = useState(true)
  const [escalateToHuman,    setEscalateToHuman]    = useState(true)
  const [escalationContact,  setEscalationContact]  = useState('')

  // Block 3 — Políticas
  const [cancelPolicy,   setCancelPolicy]   = useState('notice')
  const [cancelHours,    setCancelHours]    = useState('24')
  const [noShowPolicy,   setNoShowPolicy]   = useState('Si el cliente no se presenta, el turno queda cancelado.')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['efectivo', 'yape'])

  // Block 4 — Automatizaciones
  const [autoReply,            setAutoReply]            = useState(true)
  const [offHoursReply,        setOffHoursReply]        = useState(true)
  const [notifyNoAvail,        setNotifyNoAvail]        = useState(true)
  const [autoConfirm,          setAutoConfirm]          = useState(false)
  const [sendReminders,        setSendReminders]        = useState(true)
  const [offHoursMessage,      setOffHoursMessage]      = useState('Hola! Estamos fuera de horario. Te respondemos a la brevedad. 🐾')
  const [confirmationMessage,  setConfirmationMessage]  = useState('')
  const [reminderMessage,      setReminderMessage]      = useState('')

  // Block 5 — Objetivos
  const [objectives, setObjectives] = useState<string[]>(['more_bookings', 'recurrence'])

  // Block 6 — Avanzado
  const [extraInstructions, setExtraInstructions] = useState('')
  const [showPrompt,        setShowPrompt]        = useState(false)
  const [instructions,      setInstructions]      = useState('')

  useEffect(() => {
    api.getMyClinic().then((c: unknown) => {
      const clinic = c as { name?: string; settings?: { bot?: Record<string, unknown> } }
      setClinicName(clinic?.name ?? '')
      const b = clinic?.settings?.bot ?? {}
      if (b.assistantName)      setAssistantName(b.assistantName as string)
      if (b.communicationStyle) setCommunicationStyle(b.communicationStyle as string)
      if (typeof b.useEmojis === 'boolean')     setUseEmojis(b.useEmojis)
      if (b.responseLength)     setResponseLength(b.responseLength as string)
      if (b.welcomeMessage)     setWelcomeMessage(b.welcomeMessage as string)
      if (typeof b.allowBookings      === 'boolean') setAllowBookings(b.allowBookings)
      if (typeof b.allowReschedule    === 'boolean') setAllowReschedule(b.allowReschedule)
      if (typeof b.allowCancellations === 'boolean') setAllowCancellations(b.allowCancellations)
      if (typeof b.sharePrice         === 'boolean') setSharePrice(b.sharePrice)
      if (typeof b.shareLocation      === 'boolean') setShareLocation(b.shareLocation)
      if (typeof b.shareZones         === 'boolean') setShareZones(b.shareZones)
      if (typeof b.escalateToHuman    === 'boolean') setEscalateToHuman(b.escalateToHuman)
      if (b.escalationContact)  setEscalationContact(b.escalationContact as string)
      if (b.cancelPolicy)       setCancelPolicy(b.cancelPolicy as string)
      if (b.cancelHours)        setCancelHours(b.cancelHours as string)
      if (b.noShowPolicy)       setNoShowPolicy(b.noShowPolicy as string)
      if (Array.isArray(b.paymentMethods)) setPaymentMethods(b.paymentMethods as string[])
      if (typeof b.autoReply        === 'boolean') setAutoReply(b.autoReply)
      if (typeof b.offHoursReply    === 'boolean') setOffHoursReply(b.offHoursReply)
      if (typeof b.notifyNoAvail    === 'boolean') setNotifyNoAvail(b.notifyNoAvail)
      if (typeof b.autoConfirm      === 'boolean') setAutoConfirm(b.autoConfirm)
      if (typeof b.sendReminders    === 'boolean') setSendReminders(b.sendReminders)
      if (b.offHoursMessage)    setOffHoursMessage(b.offHoursMessage as string)
      if (b.confirmationMessage)setConfirmationMessage(b.confirmationMessage as string)
      if (b.reminderMessage)    setReminderMessage(b.reminderMessage as string)
      if (Array.isArray(b.objectives)) setObjectives(b.objectives as string[])
      if (b.extraInstructions)  setExtraInstructions(b.extraInstructions as string)
      if (b.instructions)       setInstructions(b.instructions as string)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function buildPrompt() {
    return buildBotPrompt({
      clinicName, assistantName, communicationStyle, useEmojis, responseLength,
      welcomeMessage, allowBookings, allowReschedule, allowCancellations,
      sharePrice, shareLocation, shareZones, escalateToHuman, escalationContact,
      cancelPolicy, cancelHours, noShowPolicy, paymentMethods,
      offHoursMessage, confirmationMessage, reminderMessage,
      objectives, extraInstructions,
    })
  }

  const handleSave = async () => {
    setSaveErr('')
    const prompt = buildPrompt()
    setInstructions(prompt)
    try {
      await api.updateMyClinic({
        settings: {
          bot: {
            instructions: prompt,
            assistantName, communicationStyle, useEmojis, responseLength, welcomeMessage,
            allowBookings, allowReschedule, allowCancellations,
            sharePrice, shareLocation, shareZones, escalateToHuman, escalationContact,
            cancelPolicy, cancelHours, noShowPolicy, paymentMethods,
            autoReply, offHoursReply, notifyNoAvail, autoConfirm, sendReminders,
            offHoursMessage, confirmationMessage, reminderMessage,
            objectives, extraInstructions,
          },
        },
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #601EF9', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const SYSTEM_MODULES = [
    { label: 'Servicios & precios', icon: '💲' },
    { label: 'Horarios',            icon: '⏰' },
    { label: 'Agenda',              icon: '📅' },
    { label: 'Zonas',               icon: '🗺️' },
    { label: 'Empleados',           icon: '👥' },
    { label: 'Clientes',            icon: '👤' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Banner ─────────────────────────────────────────────── */}
      <div style={{ borderRadius: 16, padding: '16px 20px', background: 'linear-gradient(135deg,#F3EEFF,#ede9fe)', border: '1px solid #ddd6fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3b0764', margin: 0 }}>El asistente ya conoce tu negocio</p>
            <p style={{ fontSize: 12, color: '#7c3aed', margin: '2px 0 0' }}>Lee automáticamente la información de todos los módulos del sistema</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SYSTEM_MODULES.map(m => (
            <span key={m.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'white', color: '#601EF9', border: '1px solid #ddd6fe' }}>
              <span style={{ fontSize: 13 }}>{m.icon}</span>{m.label}
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#601EF9', color: 'white' }}>
            ✓ Siempre actualizado
          </span>
        </div>
      </div>

      {/* ── Bloque 1: Personalidad ─────────────────────────────── */}
      <BotBlock n={1} title="Personalidad del asistente" desc="Cómo se comunica el bot con tus clientes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BotInput label="Nombre del asistente" value={assistantName} onChange={setAssistantName} placeholder="Ej: Vety, Mia, Asistente Pelitos…" />

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estilo de comunicación</label>
            <BotPillSelect value={communicationStyle} onChange={v => setCommunicationStyle(v as string)}
              options={[
                { id: 'friendly',     label: '😊 Cercano y amigable' },
                { id: 'professional', label: '💼 Profesional' },
                { id: 'premium',      label: '✨ Premium' },
                { id: 'fun',          label: '🎉 Divertido' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Longitud de respuestas</label>
              <BotPillSelect value={responseLength} onChange={v => setResponseLength(v as string)}
                options={[{ id: 'brief', label: 'Breves' }, { id: 'balanced', label: 'Equilibradas' }, { id: 'detailed', label: 'Detalladas' }]}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Emojis</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {([{ id: 'on', label: '😊 Sí' }, { id: 'off', label: 'No' }] as const).map(o => (
                  <button key={o.id} onClick={() => setUseEmojis(o.id === 'on')}
                    style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                      borderColor: (o.id === 'on') === useEmojis ? '#601EF9' : '#e2e8f0',
                      background:  (o.id === 'on') === useEmojis ? '#601EF9' : 'white',
                      color:       (o.id === 'on') === useEmojis ? 'white'   : '#475569' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <BotInput label="Mensaje de bienvenida (opcional)" value={welcomeMessage} onChange={setWelcomeMessage}
            placeholder='Ej: "¡Hola! Soy Vety de SuperVet 🐾 ¿En qué te puedo ayudar hoy?"' />
        </div>
      </BotBlock>

      {/* ── Bloque 2: Reglas de atención ───────────────────────── */}
      <BotBlock n={2} title="Reglas de atención" desc="Qué puede y qué no puede hacer el asistente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <BotToggle label="Agendar citas"       desc="El asistente puede reservar turnos directamente"             value={allowBookings}      onChange={setAllowBookings} />
          <BotToggle label="Reprogramar citas"   desc="El asistente puede cambiar la fecha u hora de un turno"      value={allowReschedule}    onChange={setAllowReschedule} />
          <BotToggle label="Cancelar citas"      desc="El asistente puede cancelar turnos a pedido del cliente"     value={allowCancellations} onChange={setAllowCancellations} />
          <BotToggle label="Compartir precios"   desc="Informa los precios de servicios cuando se le pregunta"      value={sharePrice}         onChange={setSharePrice} />
          <BotToggle label="Compartir ubicación" desc="Brinda la dirección y cómo llegar al negocio"                value={shareLocation}      onChange={setShareLocation} />
          <BotToggle label="Compartir zonas"     desc="Informa sobre zonas de cobertura para servicio a domicilio"  value={shareZones}         onChange={setShareZones} />
          <BotToggle label="Escalar a humano"    desc="Deriva al equipo cuando no puede resolver algo"               value={escalateToHuman}    onChange={setEscalateToHuman} />
          {escalateToHuman && (
            <div style={{ paddingLeft: 14, borderLeft: '2px solid #ede9fe' }}>
              <BotInput label="Número o contacto de derivación" value={escalationContact} onChange={setEscalationContact}
                placeholder="Ej: 999 123 456 — Andrea (recepción)" />
            </div>
          )}
        </div>
      </BotBlock>

      {/* ── Bloque 3: Políticas ─────────────────────────────────── */}
      <BotBlock n={3} title="Políticas del negocio" desc="El asistente comunica estas reglas cuando es relevante">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Política de cancelación</label>
            <BotPillSelect value={cancelPolicy} onChange={v => setCancelPolicy(v as string)}
              options={[{ id: 'free', label: '✅ Siempre gratis' }, { id: 'notice', label: '⏱ Aviso previo' }, { id: 'charge', label: '💳 Con cargo' }]}
            />
            {cancelPolicy === 'notice' && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anticipación mínima</label>
                <BotPillSelect value={cancelHours} onChange={v => setCancelHours(v as string)}
                  options={[{ id: '12', label: '12 h' }, { id: '24', label: '24 h' }, { id: '48', label: '48 h' }, { id: '72', label: '72 h' }]}
                />
              </div>
            )}
          </div>

          <BotInput label="Política de no-show" value={noShowPolicy} onChange={setNoShowPolicy}
            placeholder="Ej: Si el cliente no se presenta sin avisar, el turno queda cancelado." />

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Métodos de pago</label>
            <BotPillSelect value={paymentMethods} onChange={v => setPaymentMethods(v as string[])} multi
              options={[
                { id: 'efectivo',      label: 'Efectivo' },
                { id: 'yape',          label: '📱 Yape' },
                { id: 'plin',          label: '📱 Plin' },
                { id: 'transferencia', label: 'Transferencia' },
                { id: 'tarjeta',       label: '💳 Tarjeta' },
                { id: 'lukita',        label: 'Lukita' },
              ]}
            />
          </div>
        </div>
      </BotBlock>

      {/* ── Bloque 4: Automatizaciones ─────────────────────────── */}
      <BotBlock n={4} title="Automatizaciones" desc="Respuestas y acciones automáticas del asistente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <BotToggle label="Responder mensajes automáticamente"  desc="El asistente responde sin intervención manual"           value={autoReply}    onChange={setAutoReply} />
          <BotToggle label="Respuesta fuera de horario"          desc="Responde automáticamente cuando el negocio está cerrado" value={offHoursReply} onChange={setOffHoursReply} />
          <BotToggle label="Avisar cuando no haya disponibilidad" desc="Informa al cliente si no hay turnos disponibles"       value={notifyNoAvail} onChange={setNotifyNoAvail} />
          <BotToggle label="Confirmar reservas automáticamente"  desc="Envía confirmación al cliente al agendar un turno"      value={autoConfirm}  onChange={setAutoConfirm} />
          <BotToggle label="Enviar recordatorios automáticos"    desc="Recuerda la cita al cliente con anticipación"            value={sendReminders} onChange={setSendReminders} />
        </div>
        {(offHoursReply || autoConfirm || sendReminders) && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            {offHoursReply && <BotInput label="Mensaje fuera de horario"   value={offHoursMessage}     onChange={setOffHoursMessage}     placeholder="Ej: Hola! Estamos fuera de horario. Te respondemos pronto. 🐾" />}
            {autoConfirm   && <BotInput label="Mensaje de confirmación"    value={confirmationMessage}  onChange={setConfirmationMessage}  placeholder="Ej: ✅ Tu cita fue confirmada para el {fecha} a las {hora}. ¡Te esperamos!" />}
            {sendReminders && <BotInput label="Mensaje de recordatorio"    value={reminderMessage}      onChange={setReminderMessage}      placeholder="Ej: 🐾 Recordatorio: mañana a las {hora} tenés turno en {negocio}." />}
          </div>
        )}
      </BotBlock>

      {/* ── Bloque 5: Objetivos ─────────────────────────────────── */}
      <BotBlock n={5} title="Objetivos del negocio" desc="El asistente orienta sus respuestas para apoyar estos objetivos">
        <BotPillSelect value={objectives} onChange={v => setObjectives(v as string[])} multi
          options={[
            { id: 'more_bookings',  label: '📈 Más reservas' },
            { id: 'recurrence',     label: '🔁 Mayor recurrencia' },
            { id: 'reactivate',     label: '💤 Recuperar inactivos' },
            { id: 'reduce_cancel',  label: '✋ Menos cancelaciones' },
            { id: 'better_service', label: '⭐ Mejor atención' },
            { id: 'premium_upsell', label: '💎 Servicios premium' },
            { id: 'products',       label: '🛒 Productos' },
            { id: 'avg_ticket',     label: '💵 Ticket promedio' },
            { id: 'loyalty',        label: '❤️ Fidelización' },
          ]}
        />
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
          Seleccioná uno o varios. El asistente los tendrá en cuenta de forma sutil y natural, sin ser invasivo.
        </p>
      </BotBlock>

      {/* ── Bloque 6: Instrucciones adicionales ─────────────────── */}
      <BotBlock n={6} title="Instrucciones adicionales" desc="Reglas específicas que no encajan en los campos anteriores">
        <BotInput label="" value={extraInstructions} onChange={setExtraInstructions} multiline
          placeholder={"Ej:\n• Siempre mencionar las promociones activas.\n• No ofrecer descuentos sin consultar al encargado.\n• Solo atendemos perros y gatos, no reptiles.\n• El baño incluye corte de uñas sin cargo."} />
      </BotBlock>

      {/* ── Ver prompt generado ─────────────────────────────────── */}
      <button onClick={() => { const p = buildPrompt(); setInstructions(p); setShowPrompt(v => !v) }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#601EF9', background: 'transparent', border: '1.5px dashed #ddd6fe', cursor: 'pointer' }}>
        <span style={{ transform: showPrompt ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
        {showPrompt ? 'Ocultar' : 'Ver'} prompt generado (avanzado)
      </button>

      {showPrompt && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>PROMPT DEL SISTEMA</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{instructions.length} chars</span>
          </div>
          <textarea rows={12} value={instructions} onChange={e => setInstructions(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', fontSize: 11, fontFamily: 'monospace', color: '#334155', background: '#f9f9fb', border: 'none', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
        </div>
      )}

      {/* ── Guardar ─────────────────────────────────────────────── */}
      {saveErr && (
        <p style={{ fontSize: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#dc2626' }}>⚠️ {saveErr}</p>
      )}

      <button onClick={handleSave}
        style={{ padding: '13px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'white', background: saved ? '#10b981' : 'linear-gradient(135deg,#3b10b5,#601EF9)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: saved ? 'none' : '0 4px 14px rgba(96,30,249,0.3)', alignSelf: 'flex-start' }}>
        {saved ? '✓ Guardado' : '💾 Guardar configuración'}
      </button>
    </div>
  )
}


// ─── TAB: Automatizaciones ───────────────────────────────────────────────────
const AUTO_TRIGGER_LABELS: Record<string, string> = {
  booking_created:   'Se envía al crear un turno',
  booking_completed: 'Se envía al completar un turno',
  booking_cancelled: 'Se envía al cancelar un turno',
  client_created:    'Se envía al registrar un nuevo cliente',
  pet_grooming_due:  'Se envía 2 días antes del próximo baño programado',
  pet_event_due:     'Se envía días antes del evento veterinario programado',
  payment_received:  'Se envía al registrar un pago',
}
const AUTO_CAT_COLORS: Record<string, { bg: string; color: string }> = {
  'Cuidado':      { bg: '#dbeafe', color: '#1e40af' },
  'Salud':        { bg: '#dcfce7', color: '#166534' },
  'Citas':        { bg: '#F3EEFF', color: '#601EF9' },
  'Captación':    { bg: '#fef9c3', color: '#854d0e' },
  'Fidelización': { bg: '#fce7f3', color: '#9d174d' },
  'Reactivación': { bg: '#ffedd5', color: '#9a3412' },
  'General':      { bg: '#f1f5f9', color: '#475569' },
}

function TabAutomatizaciones() {
  const toast = useToast()
  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AutomationRecord | null>(null)

  useEffect(() => {
    api.getAutomations()
      .then(d => setAutomations(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (updated: AutomationRecord) =>
    setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a))

  const toggleQuick = async (auto: AutomationRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !auto.active
    setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, active: next } : a))
    try {
      await api.updateAutomation(auto.id, { active: next })
      toast.success(`${next ? '✅' : '⏸️'} "${auto.name}" ${next ? 'activada' : 'pausada'}`)
    } catch {
      setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, active: !next } : a))
      toast.error('No se pudo actualizar')
    }
  }

  const activeCount = automations.filter(a => a.active).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm" style={{ color: '#64748b' }}>
          Envía recordatorios automáticos a tus clientes por WhatsApp
        </p>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0"
          style={{ background: activeCount > 0 ? '#F3EEFF' : '#F9F9FB', border: '1px solid #ede9fe' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: activeCount > 0 ? '#601EF9' : '#CBD5E1' }} />
          <span className="text-sm font-semibold" style={{ color: activeCount > 0 ? '#601EF9' : '#94a3b8' }}>
            {activeCount} de {automations.length} activas
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} />
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#94a3b8' }}>
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-sm">No hay automatizaciones configuradas todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {automations.map(auto => {
            const cat = AUTO_CAT_COLORS[auto.category ?? 'General'] ?? AUTO_CAT_COLORS['General']
            return (
              <button key={auto.id} onClick={() => setSelected(auto)}
                className="text-left rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: '#fff',
                  border: auto.active ? '1.5px solid #a78bfa' : '1px solid #ede9fe',
                  boxShadow: auto.active ? '0 0 0 3px rgba(96,30,249,0.06)' : undefined,
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: cat.bg }}>
                      {auto.icon ?? '⚡'}
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cat.bg, color: cat.color }}>
                        {auto.category ?? 'General'}
                      </span>
                      <p className="text-sm font-bold mt-0.5 leading-tight" style={{ color: '#0f172a' }}>
                        {auto.name}
                      </p>
                    </div>
                  </div>
                  <button onClick={e => toggleQuick(auto, e)}
                    className="relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5"
                    style={{ background: auto.active ? '#601EF9' : '#CBD5E1' }}>
                    <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: auto.active ? 'translateX(22px)' : 'translateX(2px)' }} />
                  </button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                  {auto.description ?? ''}
                </p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: '#F9F9FB', border: '1px solid #f1f5f9' }}>
                  <span className="text-sm">⏰</span>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                    {AUTO_TRIGGER_LABELS[auto.trigger_event] ?? auto.trigger_event}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <span className="text-[11px] font-semibold" style={{ color: auto.active ? '#601EF9' : '#94a3b8' }}>
                    {auto.active ? '● Activa' : '○ Pausada'}
                  </span>
                  <span className="text-[11px]" style={{ color: '#c4b5fd' }}>Editar →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
        style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
        <span className="text-xl">💡</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#334155' }}>
            Los mensajes se envían por WhatsApp automáticamente
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
            Asegurate de tener WhatsApp Business conectado para que las automatizaciones funcionen.
          </p>
        </div>
      </div>

      {selected && (
        <AutomationDrawerInline
          automation={selected}
          onClose={() => setSelected(null)}
          onSaved={updated => { handleSaved(updated); setSelected(null) }}
        />
      )}
    </div>
  )
}

function AutomationDrawerInline({ automation, onClose, onSaved }: {
  automation: AutomationRecord
  onClose: () => void
  onSaved: (updated: AutomationRecord) => void
}) {
  const toast = useToast()
  const [active,  setActive]  = useState(automation.active)
  const [message, setMessage] = useState(automation.message_template ?? '')
  const [delay,   setDelay]   = useState(automation.delay_minutes)
  const [saving,  setSaving]  = useState(false)
  const cat = AUTO_CAT_COLORS[automation.category ?? 'General'] ?? AUTO_CAT_COLORS['General']

  const VARIABLES = [
    { tag: '{client_name}', label: 'Nombre del cliente' },
    { tag: '{pet_name}',    label: 'Nombre de la mascota' },
    { tag: '{fecha}',       label: 'Fecha programada' },
    { tag: '{booking_time}',label: 'Hora del turno' },
    { tag: '{booking_date}',label: 'Fecha del turno' },
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateAutomation(automation.id, { active, message_template: message, delay_minutes: delay })
      onSaved(updated)
      toast.success('Automatización guardada ✅')
    } catch { toast.error('No se pudo guardar') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{ width: 420, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: cat.bg }}>
              {automation.icon ?? '⚡'}
            </div>
            <div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                {automation.category ?? 'General'}
              </span>
              <p className="text-sm font-bold mt-0.5" style={{ color: '#0f172a' }}>{automation.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: '#94a3b8' }}>×</button>
        </div>
        <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Estado</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{active ? 'Esta automatización está activa' : 'Esta automatización está pausada'}</p>
            </div>
            <button onClick={() => setActive(v => !v)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: active ? '#601EF9' : '#CBD5E1' }}>
              <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: active ? 'translateX(26px)' : 'translateX(2px)' }} />
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#334155' }}>Mensaje de WhatsApp</label>
            <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a', fontFamily: 'inherit' }}
              onFocus={e => (e.currentTarget.style.border = '1.5px solid #601EF9')}
              onBlur={e => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
              placeholder="Ej: Hola {client_name}, recordatorio para {pet_name}…" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#334155' }}>Variables disponibles</label>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map(v => (
                <button key={v.tag} onClick={() => setMessage(p => p + v.tag)}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: '#F3EEFF', color: '#601EF9', border: '1px solid #ede9fe' }}>
                  {v.tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#334155' }}>Demora (minutos)</label>
            <input type="number" min={0} value={delay ?? 0} onChange={e => setDelay(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
              onFocus={e => (e.currentTarget.style.border = '1.5px solid #601EF9')}
              onBlur={e => (e.currentTarget.style.border = '1.5px solid #E5E7EB')} />
          </div>
        </div>
        <div className="px-6 py-5 flex gap-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity text-white"
            style={{ background: '#601EF9', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: '#F9F9FB', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
            Cancelar
          </button>
        </div>
      </div>
    </>
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

// ─── TabEquipo ────────────────────────────────────────────────────────────────
interface StaffMember {
  id: string
  name: string
  email: string
  role: 'staff' | 'manager'
  invited_at: string
  accepted_at: string | null
  active: boolean
}

function TabEquipo() {
  const [members, setMembers]   = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState<'staff' | 'manager'>('staff')
  const [sending, setSending]   = useState(false)
  const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase')
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/staff', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json() as { data?: StaffMember[] }
      setMembers(json.data ?? [])
    } catch { setMembers([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setMsg(null)
    try {
      const { createClient } = await import('@/lib/supabase')
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; message?: string; warning?: string }
      if (json.ok) {
        setMsg({ type: 'ok', text: json.message ?? json.warning ?? 'Invitación enviada ✓' })
        setEmail('')
        setName('')
        setRole('staff')
        await load()
      } else {
        setMsg({ type: 'err', text: json.error ?? 'Error al invitar' })
      }
    } catch (err) {
      setMsg({ type: 'err', text: String(err) })
    }
    setSending(false)
  }

  const remove = async (id: string) => {
    setRemoving(id)
    try {
      const { createClient } = await import('@/lib/supabase')
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      const token = session?.access_token
      await fetch(`/api/staff?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch { /* ignore */ }
    setRemoving(null)
  }

  const ROLE_LABEL: Record<string, string> = { staff: 'Colaborador', manager: 'Encargado' }
  const ROLE_COLOR: Record<string, string> = { staff: '#601EF9', manager: '#0ea5e9' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Invite form ─────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 20 }}>➕</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Invitar colaborador</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Recibirán un email para crear su cuenta y verán solo la vista operativa.</p>
          </div>
        </div>

        <form onSubmit={invite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>Email *</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="colaborador@clinica.com"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  fontSize: 13, background: '#f8fafc', boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = '#601EF9'}
                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>Nombre</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ej: María García"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  fontSize: 13, background: '#f8fafc', boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = '#601EF9'}
                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>Rol</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['staff', 'manager'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                    borderColor: role === r ? '#601EF9' : '#e2e8f0',
                    background: role === r ? '#F3EEFF' : '#f8fafc',
                    color: role === r ? '#601EF9' : '#64748b' }}>
                  {r === 'staff' ? '👤 Colaborador' : '⭐ Encargado'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '5px 0 0' }}>
              {role === 'staff' ? 'Ve citas, clientes, mascotas y chats.' : 'Mismo que colaborador + estadísticas básicas de ingresos.'}
            </p>
          </div>

          {msg && (
            <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
              color: msg.type === 'ok' ? '#16a34a' : '#dc2626',
              border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={sending || !email.trim()}
            style={{ alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg,#3b10b5,#601EF9)', color: '#fff', border: 'none',
              cursor: sending ? 'wait' : 'pointer', opacity: (sending || !email.trim()) ? 0.6 : 1 }}>
            {sending ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
      </div>

      {/* ── Current team ────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #ede9fe', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Tu equipo {!loading && members.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#601EF9', background: '#F3EEFF', padding: '2px 8px', borderRadius: 20, marginLeft: 6 }}>{members.length}</span>}
          </p>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Cargando…</p>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🙋</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Aún no invitaste a nadie.</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Invitá a tu recepcionista, bañador o asistente.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12, background: '#F9F9FB', border: '1px solid #ede9fe' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F3EEFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {m.accepted_at ? '✅' : '📧'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{m.email}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                    background: ROLE_COLOR[m.role] + '18', color: ROLE_COLOR[m.role] }}>
                    {ROLE_LABEL[m.role]}
                  </span>
                  {!m.accepted_at && (
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, padding: '3px 8px',
                      borderRadius: 20, background: '#fffbeb', border: '1px solid #fde68a' }}>
                      Pendiente
                    </span>
                  )}
                  <button onClick={() => remove(m.id)} disabled={removing === m.id}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #fecaca',
                      background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                      opacity: removing === m.id ? 0.5 : 1 }}>
                    {removing === m.id ? '…' : 'Quitar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p style={{ fontSize: 12, color: '#0369a1', margin: 0 }}>
          💡 <strong>¿Cómo funciona?</strong> El colaborador recibe un email con un link para crear su cuenta.
          Cuando inicia sesión, ve solo la vista operativa (citas, clientes, chats). 
          Finanzas y configuración avanzada son solo para vos.
        </p>
      </div>
    </div>
  )
}
