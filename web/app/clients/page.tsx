'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { BookingDrawer } from '@/components/BookingDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id:         string
  phone:      string
  name?:      string
  email?:     string
  address?:   string
  distrito?:  string
  notes?:     string
  created_at: string
  pets?:      { id: string; name: string; type: string }[]
}

const DISTRITOS_LIMA = [
  'Ancón','Ate','Barranco','Breña','Carabayllo','Chaclacayo','Chorrillos',
  'Cieneguilla','Comas','El Agustino','Independencia','Jesús María',
  'La Molina','La Victoria','Lima (Cercado)','Lince','Los Olivos',
  'Lurigancho (Chosica)','Lurín','Magdalena del Mar','Miraflores',
  'Pachacámac','Pucusana','Pueblo Libre','Puente Piedra','Punta Hermosa',
  'Punta Negra','Rímac','San Bartolo','San Borja','San Isidro',
  'San Juan de Lurigancho','San Juan de Miraflores','San Luis',
  'San Martín de Porres','San Miguel','Santa Anita','Santa María del Mar',
  'Santa Rosa','Santiago de Surco','Surquillo','Villa El Salvador',
  'Villa María del Triunfo',
  // Callao
  'Bellavista','Callao','Carmen de la Legua','La Perla','La Punta',
  'Mi Perú','Ventanilla',
]

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
interface PetDraft { name: string; type: string; breed: string; birthDate: string; groomFreq: string }
const EMPTY_PET: PetDraft = { name: '', type: 'dog', breed: '', birthDate: '', groomFreq: '' }

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Client) => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ phone: '', name: '', email: '', address: '', distrito: '', notes: '' })
  const [petDrafts, setPetDrafts] = useState<PetDraft[]>([{ ...EMPTY_PET }])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const addPet = () => setPetDrafts(p => [...p, { ...EMPTY_PET }])
  const removePet = (i: number) => setPetDrafts(p => p.filter((_, idx) => idx !== i))
  const setPetField = (i: number, k: keyof PetDraft) => (v: string) =>
    setPetDrafts(p => p.map((pet, idx) => idx === i ? { ...pet, [k]: v } : pet))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone.trim()) { toast.warning('El teléfono es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const client = await api.createClient({
        phone:    form.phone.trim(),
        name:     form.name.trim()    || undefined,
        email:    form.email.trim()   || undefined,
        address:  form.address.trim() || undefined,
        distrito: form.distrito       || undefined,
        notes:    form.notes.trim()   || undefined,
      }) as Client

      const createdPets: { id: string; name: string; type: string }[] = []
      for (const pd of petDrafts) {
        if (!pd.name.trim()) continue
        const pet = await api.createPet({
          user_id:                 client.id,
          name:                    pd.name.trim(),
          type:                    pd.type,
          breed:                   pd.breed.trim() || undefined,
          birth_date:              pd.birthDate    || undefined,
          grooming_frequency_days: pd.groomFreq ? Number(pd.groomFreq) : undefined,
        }) as Pet
        createdPets.push({ id: pet.id, name: pet.name, type: pet.type })
      }

      toast.success(`Cliente creado: ${client.name ?? client.phone}`)
      onCreated({ ...client, pets: createdPets })
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

        {/* ── Datos del dueño ── */}
        <div className="pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#94a3b8' }}>Datos del dueño</p>
          <div className="space-y-2.5">
            <MField label="Teléfono *" value={form.phone} onChange={set('phone')} placeholder="+51 9XX XXX XXX" type="tel" required />
            <MField label="Nombre"     value={form.name}  onChange={set('name')}  placeholder="Juan García" />
            <MField label="Email"      value={form.email} onChange={set('email')} placeholder="juan@email.com" type="email" />
            <MField label="Dirección"  value={form.address} onChange={set('address')} placeholder="Av. Arequipa 1234" />
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Distrito</label>
              <select
                value={form.distrito}
                onChange={e => set('distrito')(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: form.distrito ? '#0f172a' : '#94a3b8' }}
                onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
                onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
              >
                <option value="">Seleccionar distrito…</option>
                {DISTRITOS_LIMA.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Notas</label>
              <textarea rows={2} value={form.notes} onChange={e => set('notes')(e.target.value)}
                placeholder="Observaciones generales..."
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
                onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
                onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
              />
            </div>
          </div>
        </div>

        {/* ── Mascotas ── */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Mascotas</p>
            <button type="button" onClick={addPet}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: '#F3EEFF', color: '#601EF9' }}
            >
              + Agregar otra
            </button>
          </div>

          <div className="space-y-3">
            {petDrafts.map((pet, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{PET_EMOJI[pet.type] ?? '🐾'}</span>
                  <span className="text-xs font-bold" style={{ color: '#601EF9' }}>
                    {pet.name.trim() || `Mascota ${i + 1}`}
                  </span>
                  {petDrafts.length > 1 && (
                    <button type="button" onClick={() => removePet(i)}
                      className="ml-auto text-xs px-2 py-0.5 rounded-lg"
                      style={{ background: '#ede9fe', color: '#94a3b8' }}
                    >
                      ✕ Quitar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <MField label="Nombre" value={pet.name} onChange={setPetField(i, 'name')} placeholder="Rex, Luna…" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Especie</label>
                    <select value={pet.type} onChange={e => setPetField(i, 'type')(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
                      onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
                      onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
                    >
                      <option value="dog">🐶 Perro</option>
                      <option value="cat">🐱 Gato</option>
                      <option value="bird">🐦 Ave</option>
                      <option value="rabbit">🐰 Conejo</option>
                      <option value="other">🐾 Otro</option>
                    </select>
                  </div>
                  <div>
                    <MField label="Raza" value={pet.breed} onChange={setPetField(i, 'breed')} placeholder="Labrador…" />
                  </div>
                  <div>
                    <MField label="Nacimiento" value={pet.birthDate} onChange={setPetField(i, 'birthDate')} type="date" />
                  </div>
                  <div>
                    <MField label="Baño cada (días)" value={pet.groomFreq} onChange={setPetField(i, 'groomFreq')} placeholder="30" type="number" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {err && <p className="text-xs" style={{ color: '#dc2626' }}>{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando…' : 'Crear perfil'}
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

// ─── Modal: Editar cliente ────────────────────────────────────────────────────
function EditClientModal({ client, onClose, onUpdated }: {
  client: Client
  onClose: () => void
  onUpdated: (c: Client) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    phone:    client.phone    ?? '',
    name:     client.name     ?? '',
    email:    client.email    ?? '',
    address:  client.address  ?? '',
    distrito: client.distrito ?? '',
    notes:    client.notes    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone.trim()) { toast.warning('El teléfono es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const data = await api.updateClient(client.id, {
        phone:    form.phone.trim()    || undefined,
        name:     form.name.trim()     || undefined,
        email:    form.email.trim()    || undefined,
        address:  form.address.trim()  || undefined,
        distrito: form.distrito        || undefined,
        notes:    form.notes.trim()    || undefined,
      }) as Client
      toast.success('Cliente actualizado')
      onUpdated(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar'
      setErr(msg); toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Editar cliente" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <MField label="Teléfono *" value={form.phone}    onChange={set('phone')}    placeholder="+51 9XX XXX XXX" type="tel" required />
        <MField label="Nombre"     value={form.name}     onChange={set('name')}     placeholder="Juan García" />
        <MField label="Email"      value={form.email}    onChange={set('email')}    placeholder="juan@email.com" type="email" />
        <MField label="Dirección"  value={form.address}  onChange={set('address')}  placeholder="Av. Arequipa 1234" />
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Distrito</label>
          <select
            value={form.distrito}
            onChange={e => set('distrito')(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: form.distrito ? '#0f172a' : '#94a3b8' }}
            onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
            onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
          >
            <option value="">Seleccionar distrito…</option>
            {DISTRITOS_LIMA.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Notas</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes')(e.target.value)}
            placeholder="Observaciones generales..."
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
            onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
            onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
          />
        </div>
        {err && <p className="text-xs" style={{ color: '#dc2626' }}>{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
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
type ClientFilter = 'all' | 'active' | 'inactive'

export default function ClientsPage() {
  const toast    = useToast()
  const confirm  = useConfirm()

  const [query, setQuery]             = useState('')
  const [filter, setFilter]           = useState<ClientFilter>('all')
  const [clients, setClients]         = useState<Client[]>([])
  const [loading, setLoading]         = useState(true)
  const [searching, setSearching]     = useState(false)
  const [selected, setSelected]       = useState<Client | null>(null)
  const [pets, setPets]               = useState<Pet[]>([])
  const [loadingPets, setLP]          = useState(false)
  const [showNewClient, setSNC]       = useState(false)
  const [showAddPet, setSAP]          = useState(false)
  const [showEditClient, setShowEdit] = useState(false)
  const [showDrawer, setDrawer]       = useState(false)

  const [stats, setStats]           = useState<ClientStats | null>(null)
  const [loadingStats, setLStats]   = useState(true)

  useEffect(() => {
    api.getStats()
      .then((d: unknown) => {
        const s = d as Record<string, number>
        setStats({ clients_total: s.clients_total ?? 0, clients_this_month: s.clients_this_month ?? 0, clients_last_month: s.clients_last_month ?? 0, pets_total: s.pets_total ?? 0 })
      })
      .catch(() => {})
      .finally(() => setLStats(false))
  }, [])

  useEffect(() => {
    api.getRecentClients()
      .then((d: unknown) => setClients(Array.isArray(d) ? (d as Client[]) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSearching(true)
      api.getRecentClients()
        .then((d: unknown) => setClients(Array.isArray(d) ? (d as Client[]) : []))
        .catch(() => {})
        .finally(() => setSearching(false))
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const isPhone = /^\+?\d[\d\s\-]{5,}$/.test(q.replace(/\s/g, ''))
        if (isPhone) {
          const c = await api.getClientByPhone(q) as Client | null
          setClients(c ? [c] : [])
        } else {
          const d = await api.searchClients(q) as Client[]
          setClients(Array.isArray(d) ? d : [])
        }
      } catch { setClients([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  const filtered = clients.filter(c => {
    if (filter === 'active')   return (c.pets?.length ?? 0) > 0
    if (filter === 'inactive') return (c.pets?.length ?? 0) === 0
    return true
  })

  const pickClient = async (c: Client) => {
    setSelected(c); setLP(true)
    try { setPets(await api.getPetsByUser(c.id) as Pet[]) }
    catch { toast.error('No se pudieron cargar las mascotas') }
    finally { setLP(false) }
  }

  const relTime = (date: string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7)  return `Hace ${days}d`
    if (days < 30) return `Hace ${Math.floor(days / 7)}sem`
    return `Hace ${Math.floor(days / 30)}m`
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 88px)' }}>
      <StatsBar stats={stats} loading={loadingStats} />

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 360 }}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: '#94a3b8' }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full pl-9 pr-8 py-2 rounded-xl text-sm outline-none"
            style={{ background: '#fff', border: '1.5px solid #ede9fe', color: '#0f172a' }}
            onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
            onBlur={e  => e.currentTarget.style.border = '1.5px solid #ede9fe'}
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: '#601EF9' }}>…</span>
          )}
          {query && !searching && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: '#94a3b8' }}>✕</button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex p-1 rounded-xl gap-0.5" style={{ background: '#F3EEFF' }}>
          {(['all', 'active', 'inactive'] as ClientFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filter === f ? { background: '#601EF9', color: '#fff' } : { color: '#601EF9' }}>
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        <div className="ml-auto shrink-0">
          <button onClick={() => setSNC(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Client list ── */}
        <div className="flex-1 overflow-y-auto rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
          {loading ? (
            <div className="p-3 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <span className="text-5xl">👥</span>
              <p className="text-sm font-semibold" style={{ color: '#334155' }}>
                {query ? 'Sin resultados' : 'Aún no hay clientes'}
              </p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {query ? 'Intentá con otro nombre o teléfono' : 'Agregá el primer cliente de la clínica'}
              </p>
              {!query && (
                <button onClick={() => setSNC(true)}
                  className="mt-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
                  + Agregar cliente
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div
                className="grid text-[10px] font-semibold uppercase tracking-widest px-5 py-2.5 sticky top-0 z-10"
                style={{ gridTemplateColumns: '1fr 140px 120px 90px 80px 20px', background: '#F9F9FB', borderBottom: '1px solid #ede9fe', color: '#94a3b8' }}>
                <span>Cliente</span>
                <span>Teléfono</span>
                <span>Distrito</span>
                <span>Mascotas</span>
                <span>Ingresó</span>
                <span />
              </div>

              <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {filtered.map(c => (
                  <button key={c.id} onClick={() => pickClient(c)}
                    className="w-full text-left grid items-center px-5 py-3 transition-colors"
                    style={{
                      gridTemplateColumns: '1fr 140px 120px 90px 80px 20px',
                      background: selected?.id === c.id ? '#FAFAFF' : 'transparent',
                      borderLeft: selected?.id === c.id ? '3px solid #601EF9' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = '#FAFAFF' }}
                    onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.name ?? c.phone} size={34} />
                      <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                        {c.name ?? 'Sin nombre'}
                      </p>
                    </div>
                    <span className="text-xs font-mono truncate" style={{ color: '#64748b' }}>{c.phone}</span>
                    <span className="text-xs truncate" style={{ color: '#64748b' }}>{c.distrito ?? '—'}</span>
                    <span className="text-sm">
                      {(c.pets?.length ?? 0) === 0
                        ? <span style={{ color: '#cbd5e1' }}>—</span>
                        : <span title={c.pets!.map(p => p.name).join(', ')}>
                            {c.pets!.slice(0, 3).map(p => PET_EMOJI[p.type] ?? '🐾').join('')}
                            {c.pets!.length > 3 && <span className="text-[10px] ml-1" style={{ color: '#94a3b8' }}>+{c.pets!.length - 3}</span>}
                          </span>
                      }
                    </span>
                    <span className="text-[11px]" style={{ color: '#94a3b8' }}>{relTime(c.created_at)}</span>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#c4b5fd" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              <p className="text-center text-[11px] py-3" style={{ color: '#cbd5e1' }}>
                {query
                  ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                  : `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''} recientes · buscá para ver más`}
              </p>
            </>
          )}
        </div>

        {/* ── Side panel ── */}
        {selected && (
          <div className="w-72 shrink-0 overflow-y-auto rounded-2xl flex flex-col"
            style={{ background: '#fff', border: '1px solid #ede9fe' }}>

            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between shrink-0"
              style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={selected.name ?? selected.phone} size={42} />
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight truncate" style={{ color: '#0f172a' }}>
                    {selected.name ?? 'Sin nombre'}
                  </p>
                  <p className="text-[11px] mt-0.5 font-mono" style={{ color: '#94a3b8' }}>{selected.phone}</p>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setPets([]) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ml-2 mt-0.5"
                style={{ background: '#F1F5F9', color: '#94a3b8' }}>×</button>
            </div>

            {/* Contact info */}
            <div className="px-4 py-3 space-y-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
              {selected.distrito && (
                <div className="flex items-start gap-2.5">
                  <span className="text-sm shrink-0 mt-px">📍</span>
                  <span className="text-xs" style={{ color: '#334155' }}>{selected.distrito}</span>
                </div>
              )}
              {selected.address && (
                <div className="flex items-start gap-2.5">
                  <span className="text-sm shrink-0 mt-px">🏠</span>
                  <span className="text-xs" style={{ color: '#334155' }}>{selected.address}</span>
                </div>
              )}
              {selected.email && (
                <div className="flex items-start gap-2.5">
                  <span className="text-sm shrink-0 mt-px">✉️</span>
                  <span className="text-xs truncate" style={{ color: '#334155' }}>{selected.email}</span>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <span className="text-sm shrink-0 mt-px">📅</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  Cliente desde {new Date(selected.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {selected.notes && (
                <div className="flex items-start gap-2.5">
                  <span className="text-sm shrink-0 mt-px">📝</span>
                  <span className="text-xs" style={{ color: '#475569' }}>{selected.notes}</span>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="px-4 py-3 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <button
                onClick={() => window.open(`https://wa.me/${selected.phone.replace(/\D/g, '')}`, '_blank')}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: '#F3EEFF', color: '#601EF9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}>
                💬 Chat
              </button>
              <button
                onClick={() => setDrawer(true)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#601EF9' }}>
                📅 Agendar
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: '#f0f4ff', color: '#601EF9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                onMouseLeave={e => e.currentTarget.style.background = '#f0f4ff'}>
                ✏️ Editar
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Eliminar cliente',
                    message: `¿Eliminar a ${selected.name ?? selected.phone} y todas sus mascotas? Esta acción no se puede deshacer.`,
                    confirmLabel: 'Sí, eliminar',
                    cancelLabel: 'Cancelar',
                    variant: 'danger',
                  })
                  if (!ok) return
                  try {
                    await api.deleteClient(selected.id)
                    toast.success('Cliente eliminado')
                    setSelected(null)
                    setPets([])
                    setClients(prev => prev.filter(c => c.id !== selected.id))
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'Error al eliminar')
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: '#fef2f2', color: '#dc2626' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
                🗑️ Eliminar
              </button>
            </div>

            {/* Pets */}
            <div className="px-4 py-3 flex-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                  Mascotas
                </p>
                <button onClick={() => setSAP(true)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F3EEFF'}>
                  + Agregar
                </button>
              </div>

              {loadingPets && (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
                  ))}
                </div>
              )}

              {!loadingPets && pets.length === 0 && (
                <div className="text-center py-6">
                  <span className="text-3xl">🐾</span>
                  <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>Sin mascotas registradas</p>
                  <button onClick={() => setSAP(true)}
                    className="text-xs font-semibold mt-2 block mx-auto"
                    style={{ color: '#601EF9' }}>
                    + Agregar primera
                  </button>
                </div>
              )}

              {!loadingPets && pets.length > 0 && (
                <div className="space-y-2">
                  {pets.map(pet => (
                    <Link key={pet.id} href={`/pets/${pet.id}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl transition-colors block"
                      style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F3EEFF'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F9F9FB'}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: '#F3EEFF', fontSize: '1.15rem' }}>
                        {PET_EMOJI[pet.type] ?? '🐾'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{pet.name}</p>
                        <p className="text-[10px]" style={{ color: '#64748b' }}>
                          {PET_LABEL[pet.type] ?? pet.type}{pet.breed ? ` · ${pet.breed}` : ''}
                        </p>
                        {pet.grooming_frequency_days && (
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                            ✂️ Baño cada {pet.grooming_frequency_days}d
                          </p>
                        )}
                      </div>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#c4b5fd" strokeWidth={2}>
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
          onCreated={c => { setSNC(false); pickClient(c); setClients(prev => [c, ...prev]) }}
        />
      )}
      {showAddPet && selected && (
        <AddPetModal
          clientId={selected.id}
          clientName={selected.name ?? selected.phone}
          onClose={() => setSAP(false)}
          onCreated={p => { setPets(prev => [...prev, p]); setSAP(false) }}
        />
      )}
      {showEditClient && selected && (
        <EditClientModal
          client={selected}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => {
            setSelected(updated)
            setShowEdit(false)
            setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
          }}
        />
      )}

      {showDrawer && selected && (
        <BookingDrawer
          client={selected}
          initialPets={pets}
          onClose={() => setDrawer(false)}
          onCreated={() => setDrawer(false)}
        />
      )}
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: '#F1F5F9', color: '#94a3b8' }}
          >×</button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">
          {children}
        </div>
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
