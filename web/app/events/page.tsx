'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'

type EventStatus = 'PENDING' | 'NOTIFIED' | 'COMPLETED' | 'CANCELLED'
type EventType   = 'grooming' | 'vaccine' | 'checkup' | 'deworming'

interface VetEvent {
  id: string
  type: EventType
  scheduled_date: string
  status: EventStatus
  pet: { id: string; name: string; type: string; user: { name?: string; phone: string } }
}

const STATUS_LABEL: Record<EventStatus, string> = {
  PENDING:   'Pendiente',
  NOTIFIED:  'Notificado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

const STATUS_COLOR: Record<EventStatus, { bg: string; text: string }> = {
  PENDING:   { bg: '#fef9c3', text: '#854d0e' },
  NOTIFIED:  { bg: '#dbeafe', text: '#1e40af' },
  COMPLETED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#f1f5f9', text: '#64748b' },
}

const TYPE_LABEL: Record<EventType, string> = {
  grooming:  'Baño',
  vaccine:   'Vacuna',
  checkup:   'Control',
  deworming: 'Desparasitación',
}

const TYPE_ICON: Record<EventType, string> = {
  grooming:  '🛁',
  vaccine:   '💉',
  checkup:   '🩺',
  deworming: '💊',
}

export default function EventsPage() {
  const toast   = useToast()
  const confirm = useConfirm()
  const [events, setEvents]   = useState<VetEvent[]>([])
  const [status, setStatus]   = useState<string>('')
  const [type, setType]       = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (status) params.status = status
      if (type)   params.type   = type
      const data = await api.getEvents(params) as VetEvent[]
      setEvents(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar eventos')
    } finally {
      setLoading(false)
    }
  }, [status, type])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'complete' | 'cancel') => {
    if (action === 'cancel') {
      const ok = await confirm({
        title: 'Cancelar evento',
        message:
          '¿Seguro que querés cancelar este evento? Podés registrar otro más adelante si hace falta.',
        confirmLabel: 'Sí, cancelar',
        cancelLabel: 'No, volver',
        variant: 'danger',
      })
      if (!ok) return
    }
    try {
      if (action === 'complete') {
        await api.completeEvent(id)
        toast.success('Evento completado')
      } else {
        await api.cancelEvent(id)
        toast.info('Evento cancelado')
      }
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={status} onChange={setStatus} placeholder="Todos los estados">
          <option value="PENDING">Pendiente</option>
          <option value="NOTIFIED">Notificado</option>
          <option value="COMPLETED">Completado</option>
          <option value="CANCELLED">Cancelado</option>
        </Select>
        <Select value={type} onChange={setType} placeholder="Todos los tipos">
          <option value="grooming">🛁 Baño</option>
          <option value="vaccine">💉 Vacuna</option>
          <option value="checkup">🩺 Control</option>
          <option value="deworming">💊 Desparasitación</option>
        </Select>
      </div>

      {loading && <p className="text-sm" style={{ color: '#94a3b8' }}>Cargando...</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
          {events.length === 0 ? (
            <p className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>
              No hay eventos con esos filtros.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8faff', borderBottom: '1px solid #e4ebff' }}>
                <tr>
                  {['Mascota', 'Dueño', 'Tipo', 'Fecha', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr
                    key={ev.id}
                    style={{
                      borderTop: i > 0 ? '1px solid #f0f4ff' : undefined,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-3.5 font-semibold" style={{ color: '#0f172a' }}>{ev.pet.name}</td>
                    <td className="px-5 py-3.5" style={{ color: '#475569' }}>{ev.pet.user.name ?? ev.pet.user.phone}</td>
                    <td className="px-5 py-3.5">
                      <span style={{ color: '#334155' }}>
                        {TYPE_ICON[ev.type]} {TYPE_LABEL[ev.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: '#64748b' }}>{ev.scheduled_date}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: STATUS_COLOR[ev.status].bg, color: STATUS_COLOR[ev.status].text }}
                      >
                        {STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {(ev.status === 'PENDING' || ev.status === 'NOTIFIED') && (
                        <div className="flex gap-2 justify-end">
                          <ActionBtn onClick={() => handleAction(ev.id, 'complete')} variant="green">Completar</ActionBtn>
                          <ActionBtn onClick={() => handleAction(ev.id, 'cancel')} variant="ghost">Cancelar</ActionBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function Select({ value, onChange, placeholder, children }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl px-3 py-2 text-sm focus:outline-none"
      style={{ background: '#ffffff', border: '1.5px solid #e4ebff', color: value ? '#0f172a' : '#94a3b8' }}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

function ActionBtn({ onClick, variant, children }: {
  onClick: () => void
  variant: 'green' | 'blue' | 'ghost'
  children: React.ReactNode
}) {
  const styles = {
    green: { background: '#dcfce7', color: '#166534' },
    blue:  { background: '#dbeafe', color: '#1e40af' },
    ghost: { background: '#f1f5f9', color: '#475569' },
  }
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
      style={styles[variant]}
    >
      {children}
    </button>
  )
}
