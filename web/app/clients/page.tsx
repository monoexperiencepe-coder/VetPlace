'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

const inputClass =
  'w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'

// ─── Modal agregar mascota ────────────────────────────────────────────────────
interface AddPetModalProps {
  clientId: string
  clientName: string
  onClose: () => void
  onCreated: (pet: Pet) => void
}

function AddPetModal({ clientId, clientName, onClose, onCreated }: AddPetModalProps) {
  const toast = useToast()
  const [name, setName]   = useState('')
  const [type, setType]   = useState('dog')
  const [birthDate, setBirthDate] = useState('')
  const [groomFreq, setGroomFreq] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      toast.warning('Completá el nombre de la mascota')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const pet = await api.createPet({
        user_id: clientId,
        name: name.trim(),
        type,
        birth_date:              birthDate || undefined,
        grooming_frequency_days: groomFreq ? Number(groomFreq) : undefined,
      }) as Pet
      toast.success(`${pet.name} se agregó al cliente`)
      onCreated(pet)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear mascota'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(17,28,68,0.45)' }}
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: '#ffffff', border: '1px solid #e4ebff' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0f172a' }}>Nueva mascota</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xl leading-none"
            style={{ color: '#94a3b8', background: '#f0f4ff' }}
          >
            ×
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>
          Cliente: <span className="font-semibold" style={{ color: '#0f172a' }}>{clientName}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Nombre *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ej: Max"
              className={inputClass}
              style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Tipo *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`${inputClass} bg-white`}
              style={{ border: '1.5px solid #e4ebff' }}
            >
              <option value="dog">🐶 Perro</option>
              <option value="cat">🐱 Gato</option>
              <option value="bird">🐦 Ave</option>
              <option value="rabbit">🐰 Conejo</option>
              <option value="other">🐾 Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={`${inputClass} bg-white`}
              style={{ border: '1.5px solid #e4ebff' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
              Frecuencia de baño (días)
            </label>
            <input
              type="number"
              min="1"
              value={groomFreq}
              onChange={(e) => setGroomFreq(e.target.value)}
              placeholder="Ej: 30 — para recordatorios automáticos"
              className={inputClass}
              style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-xs mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            style={{ background: 'var(--blue)' }}
          >
            {submitting ? 'Creando...' : 'Crear mascota'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl"
            style={{ background: '#f0f4ff', color: '#334155' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

interface Client {
  id: string
  phone: string
  name?: string
  created_at: string
}

interface Pet {
  id: string
  name: string
  type: string
  birth_date?: string
  grooming_frequency_days?: number
}

const PET_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾',
}

const PET_TYPE_LABEL: Record<string, string> = {
  dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro',
}

export default function ClientsPage() {
  const toast = useToast()
  const [mode, setMode] = useState<'phone' | 'name'>('phone')

  // búsqueda
  const [query, setQuery]         = useState('')
  const [clients, setClients]     = useState<Client[]>([])
  const [selected, setSelected]   = useState<Client | null>(null)
  const [pets, setPets]           = useState<Pet[]>([])
  const [loadingPets, setLoadingPets] = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // nuevo cliente
  const [showAddPet, setShowAddPet] = useState(false)

  const [newPhone, setNewPhone]   = useState('')
  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const qTrim = query.trim()
  const searchDisabled =
    loading ||
    !qTrim ||
    (mode === 'name' && qTrim.length < 2)

  const reset = () => {
    setClients([])
    setSelected(null)
    setPets([])
    setError('')
  }

  const search = async () => {
    if (!qTrim) return
    if (mode === 'name' && qTrim.length < 2) {
      toast.warning('Escribí al menos 2 caracteres para buscar por nombre')
      return
    }
    if (mode === 'phone' && !/^\+\d{7,15}$/.test(qTrim)) {
      toast.warning('Usá formato internacional con +: ej. +51987654321')
      return
    }
    setLoading(true)
    reset()
    try {
      if (mode === 'phone') {
        const data = await api.getClientByPhone(qTrim) as Client
        setSelected(data)
        toast.success('Cliente encontrado')
        loadPets(data.id)
      } else {
        const data = await api.searchClients(qTrim) as Client[]
        setClients(data)
        if (data.length === 0) {
          setError('Sin resultados para ese criterio')
        } else {
          toast.success(`${data.length} resultado${data.length === 1 ? '' : 's'}`)
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No encontrado'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectClient = async (client: Client) => {
    setSelected(client)
    setClients([])
    loadPets(client.id)
  }

  const loadPets = async (userId: string) => {
    setLoadingPets(true)
    try {
      const data = await api.getPetsByUser(userId) as Pet[]
      setPets(data)
    } catch {
      setPets([])
      toast.error('No se pudieron cargar las mascotas')
    } finally {
      setLoadingPets(false)
    }
  }

  const create = async () => {
    if (!newPhone.trim()) {
      toast.warning('Ingresá el teléfono del cliente')
      return
    }
    if (!/^\+\d{7,15}$/.test(newPhone.trim())) {
      toast.warning('El teléfono debe ser E.164, ej. +51987654321')
      return
    }
    setCreating(true)
    try {
      const data = await api.createClient({ phone: newPhone.trim(), name: newName.trim() || undefined }) as Client
      toast.success(`Cliente creado: ${data.name ?? data.phone}`)
      setNewPhone('')
      setNewName('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear el cliente')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {showAddPet && selected && (
        <AddPetModal
          clientId={selected.id}
          clientName={selected.name ?? selected.phone}
          onClose={() => setShowAddPet(false)}
          onCreated={(pet) => { setPets((prev) => [...prev, pet]); setShowAddPet(false) }}
        />
      )}

      {/* Buscar */}
      <section className="rounded-2xl p-6 mb-5" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Buscar cliente</p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('phone'); reset(); setQuery('') }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={mode === 'phone'
              ? { background: 'var(--blue)', color: '#ffffff' }
              : { background: '#f0f4ff', color: '#64748b' }
            }
          >
            Por teléfono
          </button>
          <button
            onClick={() => { setMode('name'); reset(); setQuery('') }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={mode === 'name'
              ? { background: 'var(--blue)', color: '#ffffff' }
              : { background: '#f0f4ff', color: '#64748b' }
            }
          >
            Por nombre
          </button>
        </div>

        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder={mode === 'phone' ? '+51987654321' : 'Nombre del cliente...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
          />
          <button
            onClick={search}
            disabled={searchDisabled}
            className="px-4 py-2 text-white text-sm rounded-xl disabled:opacity-50"
            style={{ background: 'var(--blue)' }}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
          {mode === 'phone'
            ? 'Formato internacional: + código de país y número, sin espacios.'
            : 'Mínimo 2 caracteres. Coincide con nombre o teléfono.'}
        </p>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        {/* Resultados múltiples (búsqueda por nombre) */}
        {clients.length > 0 && (
          <ul className="mt-4 overflow-hidden rounded-xl" style={{ border: '1px solid #e4ebff' }}>
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ background: '#ffffff' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <span className="font-medium text-sm">{c.name ?? '—'}</span>
                  <span className="ml-2 text-gray-400 text-xs">{c.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Cliente seleccionado */}
        {selected && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: '#f8faff', border: '1px solid #e4ebff' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm space-y-1">
                <p><span className="text-gray-500">Nombre:</span> <span className="font-semibold">{selected.name ?? '—'}</span></p>
                <p><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{selected.phone}</span></p>
                <p><span className="text-gray-500">Desde:</span> {new Date(selected.created_at).toLocaleDateString('es-PE')}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setPets([]); setQuery('') }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Mascotas del cliente */}
            <div className="pt-3" style={{ borderTop: '1px solid #e4ebff' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mascotas</p>
                <button
                  type="button"
                  onClick={() => setShowAddPet(true)}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--blue)' }}
                >
                  + Agregar
                </button>
              </div>
              {loadingPets && <p className="text-gray-400 text-sm">Cargando...</p>}
              {!loadingPets && pets.length === 0 && (
                <p className="text-gray-400 text-sm italic">Sin mascotas registradas</p>
              )}
              {!loadingPets && pets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pets.map((p) => (
                    <Link
                      key={p.id}
                      href={`/pets/${p.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <span>{PET_EMOJI[p.type] ?? '🐾'}</span>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-gray-400 text-xs">({PET_TYPE_LABEL[p.type] ?? p.type})</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Registrar nuevo cliente */}
      <section className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #e4ebff' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>Registrar nuevo cliente</p>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Teléfono (E.164): +51987654321 *"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
          />
          <input
            type="text"
            placeholder="Nombre (opcional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            className="rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ border: '1.5px solid #e4ebff', background: '#f8faff' }}
          />
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            El cliente podrá identificarse con ese teléfono en agenda y recordatorios.
          </p>
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="px-4 py-2 text-white text-sm rounded-xl disabled:opacity-50 self-start font-semibold"
            style={{ background: 'var(--blue)' }}
          >
            {creating ? 'Creando...' : 'Crear cliente'}
          </button>
        </div>
      </section>
    </div>
  )
}
