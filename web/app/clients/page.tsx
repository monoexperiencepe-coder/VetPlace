'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id:         string
  phone:      string
  name?:      string
  email?:     string
  address?:   string
  notes?:     string
  created_at: string
  pets?:      { id: string; name: string; type: string }[]
}

interface ClientStats {
  clients_total:      number
  clients_this_month: number
  clients_last_month: number
  pets_total:         number
}

interface RecentClient {
  id:         string
  name?:      string
  phone:      string
  created_at: string
  pets:       { id: string; name: string; type: string }[]
}

interface Pet {
  id:                     string
  name:                   string
  type:                   string
  breed?:                 string
  birth_date?:            string
  grooming_frequency_days?: number
  last_grooming_date?:    string
}

const PET_EMOJI: Record<string, string>  = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', other: '🐾' }
const PET_LABEL: Record<string, string>  = { dog: 'Perro', cat: 'Gato', bird: 'Ave', rabbit: 'Conejo', other: 'Otro' }

// ─── Modal: Nuevo cliente ─────────────────────────────────────────────────────
function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Client) => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ phone: '', name: '', email: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone.trim()) { toast.warning('El teléfono es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const data = await api.createClient({
        phone: form.phone.trim(),
        name:  form.name.trim() || undefined,
      }) as Client
      toast.success(`Cliente creado: ${data.name ?? data.phone}`)
      onCreated(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cliente'
      setErr(msg); toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <MField label="Teléfono *" value={form.phone} onChange={set('phone')} placeholder="+54 9 11 XXXX-XXXX" type="tel" required />
        <MField label="Nombre"     value={form.name}  onChange={set('name')}  placeholder="Juan García" />
        <MField label="Email"      value={form.email} onChange={set('email')} placeholder="juan@email.com" type="email" />
        <MField label="Dirección"  value={form.address} onChange={set('address')} placeholder="Av. Corrientes 1234" />
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Notas</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
            placeholder="Observaciones generales..."
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
          />
        </div>
        {err && <p className="text-xs" style={{ color: '#dc2626' }}>{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando…' : 'Crear cliente'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F1F5F9', color: '#334155' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal: Agregar mascota ───────────────────────────────────────────────────
function AddPetModal({ clientId, clientName, onClose, onCreated }: {
  clientId: string; clientName: string; onClose: () => void; onCreated: (p: Pet) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', type: 'dog', breed: '', birthDate: '', groomFreq: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.warning('El nombre es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const pet = await api.createPet({
        user_id:                clientId,
        name:                   form.name.trim(),
        type:                   form.type,
        breed:                  form.breed || undefined,
        birth_date:             form.birthDate || undefined,
        grooming_frequency_days: form.groomFreq ? Number(form.groomFreq) : undefined,
      }) as Pet
      toast.success(`${pet.name} agregada al cliente`)
      onCreated(pet)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear mascota'
      setErr(msg); toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Nueva mascota · ${clientName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <MField label="Nombre *" value={form.name} onChange={set('name')} placeholder="Rex, Luna…" required />
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Especie</label>
          <select value={form.type} onChange={e => set('type')(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
          >
            <option value="dog">🐶 Perro</option>
            <option value="cat">🐱 Gato</option>
            <option value="bird">🐦 Ave</option>
            <option value="rabbit">🐰 Conejo</option>
            <option value="other">🐾 Otro</option>
          </select>
        </div>
        <MField label="Raza"               value={form.breed}     onChange={set('breed')}     placeholder="Labrador, Siamés…" />
        <MField label="Fecha de nacimiento" value={form.birthDate} onChange={set('birthDate')} type="date" />
        <MField label="Frecuencia de baño (días)" value={form.groomFreq} onChange={set('groomFreq')} placeholder="Ej: 30" type="number" />
        {err && <p className="text-xs" style={{ color: '#dc2626' }}>{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando…' : 'Agregar mascota'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F1F5F9', color: '#334155' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const toast = useToast()
  const [mode, setMode]           = useState<'phone' | 'name' | 'pet'>('name')
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Client[]>([])
  const [selected, setSelected]   = useState<Client | null>(null)
  const [pets, setPets]           = useState<Pet[]>([])
  const [loadingSearch, setLS]    = useState(false)
  const [loadingPets, setLP]      = useState(false)
  const [showNewClient, setSNC]   = useState(false)
  const [showAddPet, setSAP]      = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats]             = useState<ClientStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [loadingRecent, setLR]        = useState(true)

  useEffect(() => {
    api.getStats()
      .then((d: unknown) => {
        const s = d as Record<string, number>
        setStats({
          clients_total:      s.clients_total      ?? 0,
          clients_this_month: s.clients_this_month ?? 0,
          clients_last_month: s.clients_last_month ?? 0,
          pets_total:         s.pets_total         ?? 0,
        })
        setLoadingStats(false)
      })
      .catch(() => setLoadingStats(false))
  }, [])

  useEffect(() => {
    api.getRecentClients()
      .then((d: unknown) => {
        setRecentClients(Array.isArray(d) ? (d as RecentClient[]) : [])
        setLR(false)
      })
      .catch(() => setLR(false))
  }, [])

  const doSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLS(true); setResults([]); setSelected(null); setPets([])
    try {
      if (mode === 'phone') {
        // Teléfono es único → va directo al perfil
        const d = await api.getClientByPhone(q) as Client
        if (!d) { toast.warning('Número no encontrado'); return }
        pickClient(d)
      } else if (mode === 'pet') {
        const foundPets = await api.searchPets(q) as Array<Pet & { client?: Client }>
        if (foundPets.length === 0) { toast.warning('Sin mascotas con ese nombre'); return }
        // Deduplicar clientes, adjuntarles sus mascotas encontradas
        const clientMap = new Map<string, Client & { pets: { id: string; name: string; type: string }[] }>()
        for (const p of foundPets) {
          if (!p.client) continue
          if (!clientMap.has(p.client.id)) clientMap.set(p.client.id, { ...p.client, pets: [] })
          clientMap.get(p.client.id)!.pets.push({ id: p.id, name: p.name, type: p.type })
        }
        setResults(Array.from(clientMap.values()))
      } else {
        // Búsqueda por nombre — siempre muestra cards, nunca auto-selecciona
        const d = await api.searchClients(q) as Client[]
        if (d.length === 0) toast.warning('Sin resultados')
        setResults(d)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No encontrado')
    } finally {
      setLS(false)
    }
  }

  const pickClient = async (c: Client) => {
    setSelected(c); setResults([])
    setLP(true)
    try {
      const d = await api.getPetsByUser(c.id) as Pet[]
      setPets(d)
    } catch {
      toast.error('No se pudieron cargar las mascotas')
    } finally {
      setLP(false)
    }
  }

  const petAge = (birthDate?: string) => {
    if (!birthDate) return null
    const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.5))
    if (months < 12) return `${months}m`
    return `${Math.floor(months / 12)}a`
  }

  return (
    <div>
    <StatsBar stats={stats} loading={loadingStats} />
    <div className="flex gap-6 h-[calc(100vh-160px)]">

      {/* ── Panel izquierdo: buscador ── */}
      <div className="w-80 shrink-0 flex flex-col gap-4">

        {/* Buscador */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>Buscar cliente</p>

          {/* Modo toggle */}
          <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: '#F3EEFF' }}>
            {([
              ['name',  'Nombre'],
              ['phone', 'Teléfono'],
              ['pet',   '🐾 Mascota'],
            ] as [typeof mode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setQuery(''); setResults([]); setSelected(null); setPets([]) }}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={mode === m ? { background: '#601EF9', color: '#fff' } : { color: '#601EF9' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder={mode === 'name' ? 'Nombre del dueño…' : mode === 'phone' ? '+51 9XX XXX XXX' : 'Nombre de mascota…'}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
              onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
              onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
            />
            <button onClick={doSearch} disabled={loadingSearch}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
              style={{ background: '#601EF9', opacity: loadingSearch ? 0.7 : 1 }}
            >
              {loadingSearch ? '…' : '🔍'}
            </button>
          </div>
        </div>

        {/* Botón nuevo cliente */}
        <button onClick={() => setSNC(true)}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}
        >
          <span className="text-lg">+</span> Nuevo cliente
        </button>

        {/* Clientes recientes */}
        {!selected && (
          <div className="rounded-2xl overflow-hidden flex-1" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-4 pt-4 pb-2" style={{ color: '#94a3b8' }}>
              Recientes
            </p>

            {loadingRecent && (
              <div className="space-y-2 px-4 pb-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
                ))}
              </div>
            )}

            {!loadingRecent && recentClients.length === 0 && (
              <div className="flex flex-col items-center py-8 gap-2" style={{ color: '#94a3b8' }}>
                <span className="text-3xl">👥</span>
                <p className="text-xs">Aún no hay clientes</p>
              </div>
            )}

            {!loadingRecent && recentClients.length > 0 && (
              <div className="overflow-y-auto max-h-80">
                {recentClients.map(c => (
                  <button key={c.id} onClick={() => pickClient(c as Client)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                    style={{ borderTop: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F3EEFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Avatar name={c.name ?? c.phone} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                        {c.name ?? c.phone}
                      </p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                        {c.pets?.length
                          ? c.pets.map(p => `${PET_EMOJI[p.type] ?? '🐾'} ${p.name}`).join(' · ')
                          : 'Sin mascotas'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel derecho: resultados o perfil ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Estado: resultados de búsqueda */}
        {!selected && results.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {results.map(c => (
                <button key={c.id} onClick={() => pickClient(c)}
                  className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: '#fff', border: '1px solid #ede9fe' }}
                >
                  <Avatar name={c.name ?? c.phone} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate" style={{ color: '#0f172a' }}>
                      {c.name ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{c.phone}</p>
                    {c.pets && c.pets.length > 0 && (
                      <p className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>
                        {c.pets.map(p => `${PET_EMOJI[p.type] ?? '🐾'} ${p.name}`).join('  ·  ')}
                      </p>
                    )}
                    {(!c.pets || c.pets.length === 0) && (
                      <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>Sin mascotas registradas</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#c4b5fd" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado: vacío (sin búsqueda ni selección) */}
        {!selected && results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3" style={{ color: '#94a3b8' }}>
            <span className="text-5xl">🔍</span>
            <p className="text-sm font-medium">Buscá un cliente para ver su perfil</p>
            <p className="text-xs" style={{ color: '#cbd5e1' }}>Por nombre, teléfono o mascota</p>
          </div>
        )}

        {/* Estado: perfil del cliente */}
        {selected && (
          <div className="space-y-4">

            {/* Tarjeta principal del cliente */}
            <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                <Avatar name={selected.name ?? selected.phone} size={56} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold leading-tight" style={{ color: '#0f172a' }}>
                    {selected.name ?? 'Sin nombre'}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{selected.phone}</p>
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                    Cliente desde {new Date(selected.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => { setSelected(null); setPets([]) }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: '#F1F5F9', color: '#94a3b8' }}
                >×</button>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoPill icon="📱" label="Teléfono" value={selected.phone} />
                <InfoPill icon="📧" label="Email"    value={selected.email ?? '—'} />
                <InfoPill icon="📍" label="Dirección" value={selected.address ?? '—'} fullWidth />
                {selected.notes && (
                  <InfoPill icon="📝" label="Notas" value={selected.notes} fullWidth />
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: '1px solid #F1F5F9' }}>
                <ActionBtn icon="💬" label="WhatsApp" onClick={() => window.open(`https://wa.me/${selected.phone.replace(/\D/g, '')}`, '_blank')} />
                <ActionBtn icon="📅" label="Nuevo turno" onClick={() => {}} primary />
              </div>
            </div>

            {/* Lista de mascotas */}
            <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#0f172a' }}>Mascotas</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{pets.length} registrada{pets.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setSAP(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                  style={{ background: '#601EF9' }}
                >
                  <span>+</span> Agregar
                </button>
              </div>

              {loadingPets && (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#ede9fe' }} />)}
                </div>
              )}

              {!loadingPets && pets.length === 0 && (
                <div className="flex flex-col items-center py-8 gap-2" style={{ color: '#94a3b8' }}>
                  <span className="text-4xl">🐾</span>
                  <p className="text-sm">Sin mascotas registradas</p>
                  <button onClick={() => setSAP(true)}
                    className="text-xs font-semibold mt-1" style={{ color: '#601EF9' }}
                  >
                    Agregar primera mascota →
                  </button>
                </div>
              )}

              {!loadingPets && pets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pets.map(pet => (
                    <Link key={pet.id} href={`/pets/${pet.id}`}
                      className="flex items-center gap-3 p-4 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ background: '#F9F9FB', border: '1.5px solid #ede9fe' }}
                    >
                      {/* Emoji especie */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ background: '#F3EEFF' }}
                      >
                        {PET_EMOJI[pet.type] ?? '🐾'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{pet.name}</p>
                          {petAge(pet.birth_date) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                              style={{ background: '#F3EEFF', color: '#601EF9' }}
                            >
                              {petAge(pet.birth_date)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                          {PET_LABEL[pet.type] ?? pet.type}
                          {pet.breed ? ` · ${pet.breed}` : ''}
                        </p>
                        {pet.grooming_frequency_days && (
                          <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                            ✂️ Baño cada {pet.grooming_frequency_days} días
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modales */}
      {showNewClient && (
        <NewClientModal
          onClose={() => setSNC(false)}
          onCreated={(c) => {
            setSNC(false)
            pickClient(c)
            setRecentClients(prev => [{ ...c, pets: [] }, ...prev].slice(0, 10))
          }}
        />
      )}
      {showAddPet && selected && (
        <AddPetModal
          clientId={selected.id}
          clientName={selected.name ?? selected.phone}
          onClose={() => setSAP(false)}
          onCreated={(p) => { setPets(prev => [...prev, p]); setSAP(false) }}
        />
      )}
    </div>
    </div>
  )
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats, loading }: { stats: ClientStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
        ))}
      </div>
    )
  }

  const delta = (curr: number, prev: number) => curr - prev

  const cards = [
    {
      label: 'Clientes totales',
      value: stats?.clients_total ?? 0,
      icon: '👥',
      d: stats ? delta(stats.clients_this_month, stats.clients_last_month) : null,
      dl: 'vs mes anterior',
      sub: stats && stats.clients_total < 5 ? 'Primeros clientes' : null,
    },
    {
      label: 'Nuevos este mes',
      value: stats?.clients_this_month ?? 0,
      icon: '🆕',
      d: stats ? delta(stats.clients_this_month, stats.clients_last_month) : null,
      dl: 'vs mes pasado',
      sub: null,
    },
    {
      label: 'Mes anterior',
      value: stats?.clients_last_month ?? 0,
      icon: '📅',
      d: null,
      dl: '',
      sub: null,
    },
    {
      label: 'Mascotas',
      value: stats?.pets_total ?? 0,
      icon: '🐾',
      d: null,
      dl: '',
      sub: stats?.pets_total === 0 ? 'Sin mascotas aún' : null,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(card => (
        <div key={card.label}
          className="rounded-2xl p-4 flex flex-col gap-1"
          style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{card.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
              {card.label}
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>{card.value}</p>
          {card.d !== null && (
            card.d > 0 ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit"
                style={{ background: '#ecfdf5', color: '#059669' }}>
                ↑ +{card.d} {card.dl}
              </span>
            ) : card.d < 0 ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit"
                style={{ background: '#fef2f2', color: '#dc2626' }}>
                ↓ {card.d} {card.dl}
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: '#94a3b8' }}>= igual que antes</span>
            )
          )}
          {card.sub && (
            <span className="text-[11px]" style={{ color: '#94a3b8' }}>{card.sub}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg,#601EF9,#3b10b5)',
        fontSize: size * 0.35,
      }}
    >
      {initials || '?'}
    </div>
  )
}

function InfoPill({ icon, label, value, fullWidth }: { icon: string; label: string; value: string; fullWidth?: boolean }) {
  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl ${fullWidth ? 'col-span-2' : ''}`}
      style={{ background: '#F9F9FB', border: '1px solid #F1F5F9' }}
    >
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
        <p className="text-sm font-medium truncate mt-0.5" style={{ color: value === '—' ? '#cbd5e1' : '#0f172a' }}>{value}</p>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, primary }: {
  icon: string; label: string; onClick: () => void; primary?: boolean
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
      style={
        primary
          ? { background: '#601EF9', color: '#fff' }
          : { background: '#F1F5F9', color: '#334155' }
      }
      onMouseEnter={e => { if (!primary) e.currentTarget.style.background = '#e2e8f0' }}
      onMouseLeave={e => { if (!primary) e.currentTarget.style.background = '#F1F5F9' }}
    >
      <span>{icon}</span> {label}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.4)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: '#F1F5F9', color: '#94a3b8' }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MField({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
        onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
        onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
      />
    </div>
  )
}
