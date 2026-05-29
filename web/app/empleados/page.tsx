'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'

interface StaffMember {
  id: string
  name: string
  role: string
  color: string
  active: boolean
}

const COLORS = [
  '#601EF9','#0ea5e9','#10b981','#f59e0b',
  '#ec4899','#ef4444','#8b5cf6','#06b6d4',
]

const ROLES = ['groomer', 'veterinario', 'recepcionista', 'asistente', 'otro']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function EmpleadosPage() {
  const toast   = useToast()
  const confirm = useConfirm()

  const [staff, setStaff]     = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState<StaffMember | null>(null)

  // Form state
  const [fname, setFname]   = useState('')
  const [frole, setFrole]   = useState('groomer')
  const [fcolor, setFcolor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getStaff() as StaffMember[]
      setStaff(data)
    } catch {
      toast.error('Error al cargar empleados')
    } finally { setLoading(false) }
  }

  function openNew() {
    setEditing(null)
    setFname(''); setFrole('groomer'); setFcolor(COLORS[0])
    setShowForm(true)
  }

  function openEdit(s: StaffMember) {
    setEditing(s)
    setFname(s.name); setFrole(s.role); setFcolor(s.color)
    setShowForm(true)
  }

  async function handleSave() {
    if (!fname.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.updateStaff(editing.id, { name: fname.trim(), role: frole, color: fcolor })
        toast.success('Empleado actualizado')
      } else {
        await api.createStaff({ name: fname.trim(), role: frole, color: fcolor })
        toast.success('Empleado agregado')
      }
      setShowForm(false)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  async function handleDelete(s: StaffMember) {
    const ok = await confirm({
      title: 'Eliminar empleado',
      message: `¿Eliminar a ${s.name}? Sus citas asignadas quedarán sin asignar.`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteStaff(s.id)
      toast.info(`${s.name} eliminado`)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Empleados</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
            Agrega tu equipo para asignar citas en la agenda calendario
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl"
          style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}
        >
          <span className="text-base leading-none">+</span> Nuevo empleado
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && staff.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <div className="text-5xl mb-4">👥</div>
          <p className="text-base font-semibold mb-1" style={{ color: '#0f172a' }}>Sin empleados aún</p>
          <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>
            Agrega a tu equipo para verlos en la agenda calendario
          </p>
          <button
            onClick={openNew}
            className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl"
            style={{ background: '#601EF9' }}
          >
            + Agregar primer empleado
          </button>
        </div>
      )}

      {/* Staff list */}
      {!loading && staff.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #ede9fe' }}>
          {staff.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-4 px-5 py-4"
              style={{
                background: 'white',
                borderBottom: i < staff.length - 1 ? '1px solid #f8fafc' : 'none',
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: s.color || '#601EF9' }}
              >
                {initials(s.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{s.name}</p>
                <p className="text-xs capitalize mt-0.5" style={{ color: '#94a3b8' }}>{s.role}</p>
              </div>

              {/* Color dot */}
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(s)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ background: '#fef2f2', color: '#dc2626' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>
                {editing ? 'Editar empleado' : 'Nuevo empleado'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >✕</button>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>
                Nombre
              </label>
              <input
                value={fname}
                onChange={e => setFname(e.target.value)}
                placeholder="Ej: Karen Ríos"
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                autoFocus
              />
            </div>

            {/* Role */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>
                Rol
              </label>
              <select
                value={frole}
                onChange={e => setFrole(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                style={{ border: '1.5px solid #e2e8f0', color: '#0f172a', background: 'white' }}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>
                Color en agenda
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFcolor(c)}
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{
                      background: c,
                      transform: fcolor === c ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: fcolor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl"
                style={{ background: '#601EF9', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl"
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
