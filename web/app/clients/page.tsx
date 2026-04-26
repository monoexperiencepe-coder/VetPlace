'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

// ─── Modal agregar mascota ────────────────────────────────────────────────────
interface AddPetModalProps {
  clientId: string
  clientName: string
  onClose: () => void
  onCreated: (pet: Pet) => void
}

function AddPetModal({ clientId, clientName, onClose, onCreated }: AddPetModalProps) {
  const [name, setName]   = useState('')
  const [type, setType]   = useState('dog')
  const [birthDate, setBirthDate] = useState('')
  const [groomFreq, setGroomFreq] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) return setError('El nombre es obligatorio')
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
      onCreated(pet)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear mascota')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">Nueva mascota</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Cliente: <span className="font-medium text-gray-800">{clientName}</span></p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ej: Max"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="dog">🐶 Perro</option>
              <option value="cat">🐱 Gato</option>
              <option value="bird">🐦 Ave</option>
              <option value="rabbit">🐰 Conejo</option>
              <option value="other">🐾 Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Frecuencia de baño (días)
            </label>
            <input
              type="number"
              min="1"
              value={groomFreq}
              onChange={(e) => setGroomFreq(e.target.value)}
              placeholder="Ej: 30"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear mascota'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
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
  const [createMsg, setCreateMsg] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setClients([])
    setSelected(null)
    setPets([])
    setError('')
  }

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    reset()
    try {
      if (mode === 'phone') {
        const data = await api.getClientByPhone(query.trim()) as Client
        setSelected(data)
        loadPets(data.id)
      } else {
        const data = await api.searchClients(query.trim()) as Client[]
        setClients(data)
        if (data.length === 0) setError('Sin resultados')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No encontrado')
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
    } finally {
      setLoadingPets(false)
    }
  }

  const create = async () => {
    if (!newPhone.trim()) return
    setCreating(true)
    setCreateMsg('')
    try {
      const data = await api.createClient({ phone: newPhone.trim(), name: newName.trim() || undefined }) as Client
      setCreateMsg(`✓ Cliente creado: ${data.name ?? data.phone}`)
      setNewPhone('')
      setNewName('')
    } catch (e: unknown) {
      setCreateMsg(`✗ ${e instanceof Error ? e.message : 'Error'}`)
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

      <h2 className="text-2xl font-bold mb-8">Clientes</h2>

      {/* Buscar */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('phone'); reset(); setQuery('') }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'phone'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Por teléfono
          </button>
          <button
            onClick={() => { setMode('name'); reset(); setQuery('') }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'name'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
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
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={search}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        {/* Resultados múltiples (búsqueda por nombre) */}
        {clients.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
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
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
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
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mascotas</p>
                <button
                  onClick={() => setShowAddPet(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
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
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Registrar nuevo cliente</h3>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Teléfono (E.164): +51987654321 *"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            type="text"
            placeholder="Nombre (opcional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={create}
            disabled={creating}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 self-start"
          >
            {creating ? 'Creando...' : 'Crear cliente'}
          </button>
          {createMsg && (
            <p className={`text-sm ${createMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {createMsg}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
