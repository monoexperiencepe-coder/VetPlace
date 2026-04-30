'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'

// ─── Automation definitions ───────────────────────────────────────────────────
interface Automation {
  id:           string
  icon:         string
  name:         string
  description:  string
  trigger:      string
  defaultMsg:   string
  category:     string
}

const AUTOMATIONS: Automation[] = [
  {
    id:          'bath_reminder',
    icon:        '🛁',
    name:        'Recordatorio de baño',
    description: 'Avisa al cliente que el próximo baño de su mascota está próximo.',
    trigger:     'Se envía 2 días antes del próximo baño programado',
    defaultMsg:  'Hola {nombre_cliente} 👋\n¡Recordamos que {nombre_mascota} tiene su baño programado en 2 días!\n\nSi necesitás cambiar la fecha, respondé este mensaje o llamanos. ✂️🐾',
    category:    'Cuidado',
  },
  {
    id:          'vaccine_due',
    icon:        '💉',
    name:        'Vacuna próxima a vencer',
    description: 'Notifica cuando una vacuna está por vencer.',
    trigger:     'Se envía 3 días antes de que venza la vacuna',
    defaultMsg:  'Hola {nombre_cliente} 👋\nQueremos recordarte que {nombre_mascota} tiene una vacuna por vencer el {fecha}.\n\nPodés agendar tu cita respondiendo este mensaje. 🏥💉',
    category:    'Salud',
  },
  {
    id:          'appointment_reminder',
    icon:        '📅',
    name:        'Recordatorio de cita',
    description: 'Confirma el turno agendado con el cliente el día anterior.',
    trigger:     'Se envía 1 día antes del turno agendado',
    defaultMsg:  'Hola {nombre_cliente} 👋\nTe recordamos que mañana a las {hora} tenés turno para {nombre_mascota}.\n\nSi necesitás reprogramar, avisanos. ¡Nos vemos! 🐾',
    category:    'Citas',
  },
  {
    id:          'welcome',
    icon:        '🎉',
    name:        'Bienvenida a nuevo cliente',
    description: 'Saluda al cliente la primera vez que se registra en la clínica.',
    trigger:     'Se envía al registrar un nuevo cliente',
    defaultMsg:  'Hola {nombre_cliente} 👋\n¡Bienvenido/a a nuestra clínica veterinaria! 🐾\n\nEstamos felices de tener a {nombre_mascota} con nosotros. Para agendar o consultar, respondé este mensaje.',
    category:    'Captación',
  },
  {
    id:          'birthday',
    icon:        '🎂',
    name:        'Cumpleaños de mascota',
    description: 'Felicita al cliente el día del cumpleaños de su mascota.',
    trigger:     'Se envía el día del cumpleaños de la mascota',
    defaultMsg:  'Hola {nombre_cliente} 🎉\n¡Hoy {nombre_mascota} cumple años! Esperamos que estén celebrando juntos. 🎂🐾\n\nComo regalo especial, tenemos un descuento en su próximo baño. ¡Avisanos!',
    category:    'Fidelización',
  },
  {
    id:          'inactive_client',
    icon:        '🔔',
    name:        'Cliente sin actividad',
    description: 'Reactiva clientes que no agendaron servicio en 45 días.',
    trigger:     'Se envía si el cliente no tiene servicios en los últimos 45 días',
    defaultMsg:  'Hola {nombre_cliente} 👋\nHace un tiempo que no vemos a {nombre_mascota} por la clínica. 🐾\n\n¿Todo bien? Si necesitás agendar un baño o consulta, estamos disponibles. ¡Escribinos! 😊',
    category:    'Reactivación',
  },
]

const STORAGE_KEY = 'vetplace_automations'

interface AutomationState {
  enabled: boolean
  message: string
}

function loadStates(): Record<string, AutomationState> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, AutomationState>) : {}
  } catch { return {} }
}

function saveStates(states: Record<string, AutomationState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Cuidado':      { bg: '#dbeafe', color: '#1e40af' },
  'Salud':        { bg: '#dcfce7', color: '#166534' },
  'Citas':        { bg: '#F3EEFF', color: '#601EF9' },
  'Captación':    { bg: '#fef9c3', color: '#854d0e' },
  'Fidelización': { bg: '#fce7f3', color: '#9d174d' },
  'Reactivación': { bg: '#ffedd5', color: '#9a3412' },
}

const VARIABLES = [
  { tag: '{nombre_cliente}', label: 'Nombre del cliente' },
  { tag: '{nombre_mascota}', label: 'Nombre de la mascota' },
  { tag: '{fecha}',          label: 'Fecha' },
  { tag: '{hora}',           label: 'Hora del turno' },
]

// ─── WhatsApp preview ─────────────────────────────────────────────────────────
function WAPreview({ message }: { message: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#E5DDD5' }}>
      <div className="max-w-xs ml-auto">
        <div className="rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm" style={{ background: '#DCF8C6' }}>
          <p className="text-sm whitespace-pre-line" style={{ color: '#111b21', lineHeight: 1.5 }}>
            {message || <span style={{ color: '#94a3b8' }}>El mensaje aparecerá aquí…</span>}
          </p>
          <p className="text-right text-[10px] mt-1.5" style={{ color: '#667781' }}>Ahora ✓✓</p>
        </div>
      </div>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function AutomationDrawer({
  automation,
  state,
  onClose,
  onSave,
}: {
  automation: Automation
  state: AutomationState
  onClose: () => void
  onSave: (s: AutomationState) => void
}) {
  const toast = useToast()
  const [enabled, setEnabled] = useState(state.enabled)
  const [message, setMessage] = useState(state.message || automation.defaultMsg)
  const [preview, setPreview] = useState(false)

  const insertVar = (tag: string) => {
    setMessage(m => m + tag)
  }

  const save = () => {
    onSave({ enabled, message })
    toast.success(`✓ Automatización "${automation.name}" ${enabled ? 'activada' : 'desactivada'} y guardada`)
    onClose()
  }

  const cat = CATEGORY_COLORS[automation.category] ?? { bg: '#F3EEFF', color: '#601EF9' }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: 420, background: '#fff', boxShadow: '-8px 0 40px rgba(96,30,249,0.12)', borderLeft: '1px solid #ede9fe' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: cat.bg }}>
                {automation.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: cat.bg, color: cat.color }}>
                  {automation.category}
                </span>
                <h3 className="text-base font-bold mt-0.5" style={{ color: '#0f172a' }}>
                  {automation.name}
                </h3>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: '#F1F5F9', color: '#94a3b8' }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Estado */}
          <div className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background: enabled ? '#F3EEFF' : '#F9F9FB', border: `1.5px solid ${enabled ? '#a78bfa' : '#E5E7EB'}` }}>
            <div>
              <p className="text-sm font-bold" style={{ color: enabled ? '#601EF9' : '#334155' }}>
                {enabled ? '✅ Automatización activa' : '⏸️ Automatización pausada'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                {enabled ? 'Los mensajes se enviarán automáticamente' : 'No se enviarán mensajes'}
              </p>
            </div>
            <button
              onClick={() => setEnabled(e => !e)}
              className="relative w-12 h-6 rounded-full transition-colors shrink-0"
              style={{ background: enabled ? '#601EF9' : '#CBD5E1' }}>
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: enabled ? 'translateX(24px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {/* Trigger */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
              Cuándo se envía
            </p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
              <span className="text-2xl shrink-0">⏰</span>
              <p className="text-sm font-medium" style={{ color: '#334155' }}>{automation.trigger}</p>
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                Mensaje
              </p>
              <button onClick={() => setPreview(v => !v)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: preview ? '#601EF9' : '#F3EEFF', color: preview ? '#fff' : '#601EF9' }}>
                {preview ? '✏️ Editar' : '👁 Vista previa'}
              </button>
            </div>

            {preview ? (
              <WAPreview message={message} />
            ) : (
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a', lineHeight: 1.6 }}
                onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
                onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
              />
            )}
          </div>

          {/* Variables */}
          {!preview && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
                Insertar variable
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(v => (
                  <button key={v.tag} onClick={() => insertVar(v.tag)}
                    className="text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: '#F3EEFF', color: '#601EF9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                    onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}
                    title={v.label}>
                    {v.tag}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: '#94a3b8' }}>
                Las variables se reemplazan automáticamente al enviar.
              </p>
            </div>
          )}

          {/* Reset */}
          {!preview && message !== automation.defaultMsg && (
            <button onClick={() => setMessage(automation.defaultMsg)}
              className="text-xs font-medium"
              style={{ color: '#94a3b8' }}>
              ↺ Restaurar mensaje original
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 space-y-2" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button onClick={save}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            Guardar cambios
          </button>
          <button onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold"
            style={{ color: '#94a3b8' }}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AutomationsPage() {
  const toast = useToast()
  const [states, setStates]     = useState<Record<string, AutomationState>>({})
  const [selected, setSelected] = useState<Automation | null>(null)

  useEffect(() => {
    setStates(loadStates())
  }, [])

  const getState = (id: string): AutomationState =>
    states[id] ?? { enabled: false, message: '' }

  const toggleQuick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = getState(id)
    const next = { ...current, enabled: !current.enabled }
    const updated = { ...states, [id]: next }
    setStates(updated)
    saveStates(updated)
    const auto = AUTOMATIONS.find(a => a.id === id)
    toast.success(`${next.enabled ? '✅' : '⏸️'} "${auto?.name}" ${next.enabled ? 'activada' : 'pausada'}`)
  }

  const handleSave = (id: string, s: AutomationState) => {
    const updated = { ...states, [id]: s }
    setStates(updated)
    saveStates(updated)
  }

  const activeCount = AUTOMATIONS.filter(a => getState(a.id).enabled).length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Envía recordatorios automáticos a tus clientes por WhatsApp
          </p>
        </div>
        {/* Summary pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0"
          style={{ background: activeCount > 0 ? '#F3EEFF' : '#F9F9FB', border: '1px solid #ede9fe' }}>
          <span className="w-2 h-2 rounded-full"
            style={{ background: activeCount > 0 ? '#601EF9' : '#CBD5E1' }} />
          <span className="text-sm font-semibold"
            style={{ color: activeCount > 0 ? '#601EF9' : '#94a3b8' }}>
            {activeCount} de {AUTOMATIONS.length} activas
          </span>
        </div>
      </div>

      {/* ── Grid of automations ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AUTOMATIONS.map(auto => {
          const st  = getState(auto.id)
          const cat = CATEGORY_COLORS[auto.category] ?? { bg: '#F3EEFF', color: '#601EF9' }
          return (
            <button
              key={auto.id}
              onClick={() => setSelected(auto)}
              className="text-left rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{
                background: '#fff',
                border: st.enabled ? '1.5px solid #a78bfa' : '1px solid #ede9fe',
                boxShadow: st.enabled ? '0 0 0 3px rgba(96,30,249,0.06)' : undefined,
              }}
            >
              {/* Card top */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: cat.bg }}>
                    {auto.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: cat.bg, color: cat.color }}>
                      {auto.category}
                    </span>
                    <p className="text-sm font-bold mt-0.5 leading-tight" style={{ color: '#0f172a' }}>
                      {auto.name}
                    </p>
                  </div>
                </div>

                {/* Quick toggle */}
                <button
                  onClick={e => toggleQuick(auto.id, e)}
                  className="relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5"
                  style={{ background: st.enabled ? '#601EF9' : '#CBD5E1' }}
                  title={st.enabled ? 'Desactivar' : 'Activar'}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: st.enabled ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                {auto.description}
              </p>

              {/* Trigger */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: '#F9F9FB', border: '1px solid #f1f5f9' }}>
                <span className="text-sm">⏰</span>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>{auto.trigger}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #f1f5f9' }}>
                <span className="text-[11px] font-semibold"
                  style={{ color: st.enabled ? '#601EF9' : '#94a3b8' }}>
                  {st.enabled ? '● Activa' : '○ Pausada'}
                </span>
                <span className="text-[11px]" style={{ color: '#c4b5fd' }}>Editar →</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Info footer */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
        style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
        <span className="text-xl">💡</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#334155' }}>
            Los mensajes se envían por WhatsApp automáticamente
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
            Asegurate de tener WhatsApp Business conectado en Configuración para que las automatizaciones funcionen.
          </p>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <AutomationDrawer
          automation={selected}
          state={getState(selected.id)}
          onClose={() => setSelected(null)}
          onSave={s => handleSave(selected.id, s)}
        />
      )}
    </div>
  )
}
