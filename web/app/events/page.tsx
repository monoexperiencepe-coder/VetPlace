'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

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

const STATUS_COLOR: Record<EventStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  NOTIFIED:  'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const TYPE_LABEL: Record<EventType, string> = {
  grooming:   'Baño',
  vaccine:    'Vacuna',
  checkup:    'Control',
  deworming:  'Desparasitación',
}

export default function EventsPage() {
  const [events, setEvents]     = useState<VetEvent[]>([])
  const [status, setStatus]     = useState<string>('')
  const [type, setType]         = useState<string>('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

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
    try {
      if (action === 'complete') await api.completeEvent(id)
      else await api.cancelEvent(id)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Eventos</h2>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="NOTIFIED">Notificado</option>
          <option value="COMPLETED">Completado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="grooming">Baño</option>
          <option value="vaccine">Vacuna</option>
          <option value="checkup">Control</option>
          <option value="deworming">Desparasitación</option>
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}
      {error   && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {events.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No hay eventos con esos filtros.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Mascota</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Dueño</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{ev.pet.name}</td>
                    <td className="px-5 py-3 text-gray-600">{ev.pet.user.name ?? ev.pet.user.phone}</td>
                    <td className="px-5 py-3 text-gray-600">{TYPE_LABEL[ev.type]}</td>
                    <td className="px-5 py-3 text-gray-600">{ev.scheduled_date}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[ev.status]}`}>
                        {STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {(ev.status === 'PENDING' || ev.status === 'NOTIFIED') && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleAction(ev.id, 'complete')}
                            className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => handleAction(ev.id, 'cancel')}
                            className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                          >
                            Cancelar
                          </button>
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
