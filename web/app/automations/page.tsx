'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import { api, type AutomationRecord } from '@/lib/api'

// ─── Trigger label map (display text per event type) ─────────────────────────
const TRIGGER_LABELS: Record<string, string> = {
  booking_created:   'Se envía al crear un turno',
  booking_completed: 'Se envía al completar un turno',
  booking_cancelled: 'Se envía al cancelar un turno',
  client_created:    'Se envía al registrar un nuevo cliente',
  pet_grooming_due:  'Se envía 2 días antes del próximo baño programado',
  pet_event_due:     'Se envía días antes del evento veterinario programado',
  payment_received:  'Se envía al registrar un pago',
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Cuidado':      { bg: '#dbeafe', color: '#1e40af' },
  'Salud':        { bg: '#dcfce7', color: '#166534' },
  'Citas':        { bg: '#F3EEFF', color: '#601EF9' },
  'Captación':    { bg: '#fef9c3', color: '#854d0e' },
  'Fidelización': { bg: '#fce7f3', color: '#9d174d' },
  'Reactivación': { bg: '#ffedd5', color: '#9a3412' },
  'General':      { bg: '#f1f5f9', color: '#475569' },
}

const VARIABLES = [
  { tag: '{client_name}',    label: 'Nombre del cliente' },
  { tag: '{pet_name}',       label: 'Nombre de la mascota' },
  { tag: '{fecha}',          label: 'Fecha programada' },
  { tag: '{booking_time}',   label: 'Hora del turno' },
  { tag: '{booking_date}',   label: 'Fecha del turno' },
]

// ─── WhatsApp preview ─────────────────────────────────────────────────────────
function WAPreview({ message }: { message: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#e5ddd5', minHeight: 80 }}>
      <div className="rounded-2xl px-3 py-2 max-w-xs text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: '#fff', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,0.12)', marginLeft: 'auto' }}>
        {message || <span style={{ color: '#94a3b8' }}>El mensaje aparecerá aquí…</span>}
      </div>
    </div>
  )
}

// ─── Automation Drawer ────────────────────────────────────────────────────────
interface DrawerProps {
  automation: AutomationRecord
  onClose:    () => void
  onSaved:    (updated: AutomationRecord) => void
}

function AutomationDrawer({ automation, onClose, onSaved }: DrawerProps) {
  const toast   = useToast()
  const [active,   setActive]   = useState(automation.active)
  const [message,  setMessage]  = useState(automation.message_template ?? '')
  const [delay,    setDelay]    = useState(automation.delay_minutes)
  const [preview,  setPreview]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateAutomation(automation.id, {
        active,
        message_template: message,
        delay_minutes:    delay,
      })
      onSaved(updated)
      toast.success('Automatización guardada ✅')
      onClose()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = (tag: string) => {
    setMessage(prev => prev + tag)
  }

  const cat = CATEGORY_COLORS[automation.category ?? 'General'] ?? CATEGORY_COLORS['General']

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{ width: 420, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: cat.bg }}>
              {automation.icon ?? '⚡'}
            </div>
            <div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: cat.bg, color: cat.color }}>
                {automation.category ?? 'General'}
              </span>
              <p className="text-sm font-bold mt-0.5" style={{ color: '#0f172a' }}>{automation.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-lg" style={{ color: '#94a3b8' }}>✕</button>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-6">

          {/* Toggle active */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#334155' }}>Estado</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {active ? 'Esta automatización está activa' : 'Esta automatización está pausada'}
              </p>
            </div>
            <button
              onClick={() => setActive(v => !v)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: active ? '#601EF9' : '#CBD5E1' }}
            >
              <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: active ? 'translateX(26px)' : 'translateX(2px)' }} />
            </button>
          </div>

          {/* Trigger */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
              Disparador
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9F9FB', border: '1px solid #f1f5f9' }}>
              <span>⏰</span>
              <p className="text-xs" style={{ color: '#64748b' }}>
                {TRIGGER_LABELS[automation.trigger_event] ?? automation.trigger_event}
              </p>
            </div>
          </div>

          {/* Delay */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
              Demora antes de enviar
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={delay}
                onChange={e => setDelay(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-xl text-sm"
                style={{ border: '1px solid #e2e8f0', outline: 'none' }}
              />
              <span className="text-sm" style={{ color: '#64748b' }}>minutos</span>
            </div>
          </div>

          {/* Message template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                Mensaje
              </p>
              <button
                onClick={() => setPreview(v => !v)}
                className="text-xs font-semibold px-3 py-1 rounded-full transition-colors"
                style={{
                  background: preview ? '#601EF9' : '#F3EEFF',
                  color:      preview ? '#fff'     : '#601EF9',
                }}>
                {preview ? '✏️ Editar' : '👁️ Preview'}
              </button>
            </div>

            {preview ? (
              <WAPreview message={message} />
            ) : (
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                className="w-full px-4 py-3 rounded-2xl text-sm leading-relaxed resize-none"
                style={{ border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit' }}
                placeholder="Escribe el mensaje que recibirá el cliente…"
              />
            )}
          </div>

          {/* Variables */}
          {!preview && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                Variables disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                  <button
                    key={v.tag}
                    onClick={() => insertVariable(v.tag)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                    style={{ background: '#F3EEFF', color: '#601EF9', border: '1px solid #ede9fe' }}
                    title={v.label}
                  >
                    {v.tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex gap-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity"
            style={{ background: '#601EF9', color: '#fff', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: '#F9F9FB', color: '#94a3b8', border: '1px solid #e2e8f0' }}
          >
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
  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<AutomationRecord | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getAutomations()
      setAutomations(data)
    } catch {
      toast.error('No se pudieron cargar las automatizaciones')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleSaved = (updated: AutomationRecord) => {
    setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  const toggleQuick = async (auto: AutomationRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !auto.active
    // Optimistic update
    setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, active: next } : a))
    try {
      await api.updateAutomation(auto.id, { active: next })
      toast.success(`${next ? '✅' : '⏸️'} "${auto.name}" ${next ? 'activada' : 'pausada'}`)
    } catch {
      // Revert on error
      setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, active: !next } : a))
      toast.error('No se pudo actualizar')
    }
  }

  const activeCount = automations.filter(a => a.active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#601EF9', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Envía recordatorios automáticos a tus clientes por WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0"
          style={{ background: activeCount > 0 ? '#F3EEFF' : '#F9F9FB', border: '1px solid #ede9fe' }}>
          <span className="w-2 h-2 rounded-full"
            style={{ background: activeCount > 0 ? '#601EF9' : '#CBD5E1' }} />
          <span className="text-sm font-semibold"
            style={{ color: activeCount > 0 ? '#601EF9' : '#94a3b8' }}>
            {activeCount} de {automations.length} activas
          </span>
        </div>
      </div>

      {/* Grid */}
      {automations.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#94a3b8' }}>
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-sm">No hay automatizaciones configuradas todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {automations.map(auto => {
            const cat = CATEGORY_COLORS[auto.category ?? 'General'] ?? CATEGORY_COLORS['General']
            return (
              <button
                key={auto.id}
                onClick={() => setSelected(auto)}
                className="text-left rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background:  '#fff',
                  border:      auto.active ? '1.5px solid #a78bfa' : '1px solid #ede9fe',
                  boxShadow:   auto.active ? '0 0 0 3px rgba(96,30,249,0.06)' : undefined,
                }}
              >
                {/* Card top */}
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

                  {/* Quick toggle */}
                  <button
                    onClick={e => toggleQuick(auto, e)}
                    className="relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5"
                    style={{ background: auto.active ? '#601EF9' : '#CBD5E1' }}
                    title={auto.active ? 'Desactivar' : 'Activar'}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: auto.active ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                  {auto.description ?? ''}
                </p>

                {/* Trigger */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: '#F9F9FB', border: '1px solid #f1f5f9' }}>
                  <span className="text-sm">⏰</span>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                    {TRIGGER_LABELS[auto.trigger_event] ?? auto.trigger_event}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <span className="text-[11px] font-semibold"
                    style={{ color: auto.active ? '#601EF9' : '#94a3b8' }}>
                    {auto.active ? '● Activa' : '○ Pausada'}
                  </span>
                  <span className="text-[11px]" style={{ color: '#c4b5fd' }}>Editar →</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

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
          onClose={() => setSelected(null)}
          onSaved={updated => { handleSaved(updated); setSelected(null) }}
        />
      )}
    </div>
  )
}
