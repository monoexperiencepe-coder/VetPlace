'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  from: 'client' | 'bot' | 'staff'
  text: string
  time: string
}

interface Pet {
  name: string
  species: string
  breed: string
  status?: 'grooming_soon' | 'vaccine_overdue' | 'ok'
}

interface Client {
  id: string
  name: string
  phone: string
  district?: string
  avatar: string
  pets: Pet[]
  lastBooking: string | null
  hasActiveService: boolean
  assignedRoute?: string
  unread: number
  lastMessage: string
  lastTime: string
  botActive: boolean
  messages: Message[]
}

type Filter = 'all' | 'unread' | 'pending'

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_CLIENTS: Client[] = [
  {
    id: '1', name: 'Lucía Fernández', phone: '+54 9 11 2345-6789', district: 'Palermo',
    avatar: 'LF',
    pets: [
      { name: 'Luna', species: 'Perro', breed: 'Labrador', status: 'grooming_soon' },
    ],
    lastBooking: '28 Abr 2026 – Baño y corte',
    hasActiveService: true, assignedRoute: 'Ruta Norte · Parada 2',
    unread: 2, lastMessage: '¿A qué hora es el turno mañana?', lastTime: '14:32',
    botActive: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Hola! Quería confirmar el turno de mañana para Luna 🐶', time: '14:28' },
      { id: 'm2', from: 'bot',    text: 'Hola Lucía! 👋 Tu turno está confirmado para mañana a las 10:00 hs. ¿Necesitás algo más?', time: '14:29' },
      { id: 'm3', from: 'client', text: '¿A qué hora es el turno mañana?', time: '14:32' },
    ],
  },
  {
    id: '2', name: 'Marcos Rodríguez', phone: '+54 9 11 9876-5432', district: 'Belgrano',
    avatar: 'MR',
    pets: [
      { name: 'Milo',  species: 'Gato',  breed: 'Siamés',           status: 'vaccine_overdue' },
      { name: 'Thor',  species: 'Perro', breed: 'Golden Retriever',  status: 'ok' },
    ],
    lastBooking: '25 Abr 2026 – Vacuna antirrábica',
    hasActiveService: false,
    unread: 0, lastMessage: 'Perfecto, muchas gracias!', lastTime: 'Ayer',
    botActive: false,
    messages: [
      { id: 'm1', from: 'client', text: 'Buenas, necesito sacar turno para vacunar a Milo', time: '10:05' },
      { id: 'm2', from: 'bot',    text: 'Claro! Tenemos disponibilidad el viernes 25 a las 15:00 hs. ¿Te viene bien?', time: '10:06' },
      { id: 'm3', from: 'client', text: 'Sí, perfecto!', time: '10:10' },
      { id: 'm4', from: 'staff',  text: 'Confirmado ✅ Te esperamos el viernes. Cualquier duda no dudes en escribir.', time: '10:12' },
      { id: 'm5', from: 'client', text: 'Perfecto, muchas gracias!', time: '10:15' },
    ],
  },
  {
    id: '3', name: 'Ana Gómez', phone: '+54 9 11 5544-3322', district: 'Caballito',
    avatar: 'AG',
    pets: [{ name: 'Coco', species: 'Perro', breed: 'Beagle', status: 'ok' }],
    lastBooking: null,
    hasActiveService: false,
    unread: 1, lastMessage: 'Mi perro está comiendo poco, ¿puede ser algo serio?', lastTime: '09:15',
    botActive: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Mi perro está comiendo poco, ¿puede ser algo serio?', time: '09:15' },
    ],
  },
  {
    id: '4', name: 'Carlos Suárez', phone: '+54 9 11 7788-9900', district: 'Villa Urquiza',
    avatar: 'CS',
    pets: [{ name: 'Rex', species: 'Perro', breed: 'Pastor Alemán', status: 'grooming_soon' }],
    lastBooking: '20 Abr 2026 – Control general',
    hasActiveService: true, assignedRoute: 'Ruta Sur · Parada 1',
    unread: 0, lastMessage: 'Gracias por el recordatorio 🙏', lastTime: 'Lun',
    botActive: true,
    messages: [
      { id: 'm1', from: 'bot',    text: 'Hola Carlos! Te recordamos que Rex tiene turno el lunes 20 a las 11:00 hs.', time: 'Dom 18:00' },
      { id: 'm2', from: 'client', text: 'Gracias por el recordatorio 🙏', time: 'Dom 18:05' },
    ],
  },
]

const PET_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  grooming_soon:   { label: 'Baño pronto',     color: '#f59e0b', bg: '#fffbeb' },
  vaccine_overdue: { label: 'Vacuna vencida',  color: '#ef4444', bg: '#fef2f2' },
  ok:              { label: 'Al día',          color: '#10b981', bg: '#f0fdf4' },
}

const PET_EMOJI: Record<string, string> = { Perro: '🐕', Gato: '🐱', Ave: '🐦', Conejo: '🐇' }

const TEMPLATES = [
  '¡Hola! Te recordamos tu turno para mañana. 📅',
  '¿Todo bien con tu mascota tras la última visita? 🐾',
  'Tu turno está confirmado ✅',
  'Podemos reagendar el turno sin problema. ¿Qué día te viene bien?',
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChatsPage() {
  const [clients, setClients]         = useState<Client[]>(MOCK_CLIENTS)
  const [selectedId, setSelectedId]   = useState<string>(MOCK_CLIENTS[0].id)
  const [input, setInput]             = useState('')
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<Filter>('all')
  const [showTemplates, setShowTemplates] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selected = clients.find(c => c.id === selectedId)!

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, clients])

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
    if (!matchSearch) return false
    if (filter === 'unread')  return c.unread > 0
    if (filter === 'pending') return c.messages.at(-1)?.from === 'client'
    return true
  })

  const toggleBot = (id: string) =>
    setClients(prev => prev.map(c => c.id === id ? { ...c, botActive: !c.botActive } : c))

  const sendMessage = (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg) return
    const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    setClients(prev => prev.map(c =>
      c.id === selectedId
        ? { ...c, messages: [...c.messages, { id: Date.now().toString(), from: 'staff', text: msg, time: now }], lastMessage: msg, lastTime: now }
        : c
    ))
    setInput('')
    setShowTemplates(false)
  }

  const selectConv = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
    setSelectedId(id)
    setShowTemplates(false)
  }

  const markResolved = (id: string) =>
    setClients(prev => prev.map(c => c.id === id ? { ...c, unread: 0, lastMessage: '✓ Resuelto' } : c))

  const totalUnread = clients.reduce((s, c) => s + c.unread, 0)

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 88px)', border: '1px solid #ede9fe', background: '#ffffff' }}
    >

      {/* ══════════════════════════════
          COL 1 — Lista de conversaciones
      ══════════════════════════════ */}
      <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: '1px solid #F1F5F9' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold" style={{ color: '#0f172a' }}>Conversaciones</h2>
              {totalUnread > 0 && (
                <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: '#601EF9' }}>
                  {totalUnread}
                </span>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mb-3">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl outline-none"
              style={{ background: '#F9F9FB', border: '1px solid #ede9fe', color: '#0f172a' }}
            />
          </div>

          {/* Filtros */}
          <div className="flex gap-1">
            {([['all', 'Todos'], ['unread', 'No leídos'], ['pending', 'Pendientes']] as [Filter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className="flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={filter === f
                  ? { background: '#601EF9', color: '#fff' }
                  : { background: '#F1F5F9', color: '#64748b' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-2" style={{ color: '#94a3b8' }}>
              <span className="text-3xl">💬</span>
              <p className="text-xs">Sin conversaciones</p>
            </div>
          )}
          {filtered.map(c => {
            const isPending = c.messages.at(-1)?.from === 'client'
            const isSelected = c.id === selectedId
            return (
              <button key={c.id} onClick={() => selectConv(c.id)}
                className="w-full text-left px-3 py-3 flex items-start gap-2.5 transition-all"
                style={{
                  background: isSelected ? '#F3EEFF' : 'transparent',
                  borderLeft: isSelected ? '3px solid #601EF9' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Avatar con indicador online */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                    {c.avatar}
                  </div>
                  {c.hasActiveService && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ background: '#10b981' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold truncate" style={{ color: '#0f172a', fontWeight: c.unread > 0 ? 700 : 600 }}>
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px]" style={{ color: '#94a3b8' }}>{c.lastTime}</span>
                      {c.unread > 0 && (
                        <span className="text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white"
                          style={{ background: '#601EF9' }}>
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] truncate" style={{ color: '#64748b', fontWeight: c.unread > 0 ? 500 : 400 }}>
                    {c.lastMessage}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={c.botActive ? { background: '#F3EEFF', color: '#601EF9' } : { background: '#F1F5F9', color: '#94a3b8' }}>
                      {c.botActive ? '🤖 Bot' : '○ Manual'}
                    </span>
                    {isPending && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: '#fffbeb', color: '#d97706' }}>
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════
          COL 2 — Chat activo
      ══════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                {selected.avatar}
              </div>
              {selected.hasActiveService && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                  style={{ background: '#10b981' }} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight" style={{ color: '#0f172a' }}>{selected.name}</p>
              <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                {selected.phone}{selected.district ? ` · ${selected.district}` : ''}
              </p>
            </div>
          </div>

          {/* Bot toggle + acciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => markResolved(selected.id)}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-colors"
              style={{ background: '#f0fdf4', color: '#16a34a' }}
            >
              ✓ Resolver
            </button>
            <a
              href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-colors"
              style={{ background: '#dcfce7', color: '#16a34a' }}
            >
              💬 WhatsApp
            </a>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[11px] font-medium" style={{ color: '#64748b' }}>Bot</span>
              <button
                onClick={() => toggleBot(selected.id)}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: selected.botActive ? '#601EF9' : '#e2e8f0' }}
              >
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: selected.botActive ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ background: '#FAFAFC' }}>
          {selected.messages.map(msg => (
            <div key={msg.id}
              className={`flex flex-col max-w-[72%] ${msg.from === 'client' ? 'self-start items-start' : 'self-end items-end ml-auto'}`}
            >
              <span className="text-[10px] mb-0.5 px-1 font-medium" style={{ color: '#94a3b8' }}>
                {msg.from === 'client' ? selected.name : msg.from === 'bot' ? '🤖 Bot' : '👤 Staff'}
              </span>
              <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.from === 'client'
                    ? { background: '#fff', border: '1px solid #ede9fe', color: '#0f172a', borderBottomLeftRadius: 4 }
                    : msg.from === 'bot'
                    ? { background: '#F3EEFF', color: '#3b10b5', borderBottomRightRadius: 4 }
                    : { background: '#601EF9', color: '#fff', borderBottomRightRadius: 4 }
                }
              >
                {msg.text}
              </div>
              <span className="text-[10px] mt-0.5 px-1" style={{ color: '#94a3b8' }}>{msg.time}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="px-4 pb-2" style={{ background: '#fff', borderTop: '1px solid #F1F5F9' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest py-2" style={{ color: '#94a3b8' }}>Plantillas rápidas</p>
            <div className="space-y-1">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => sendMessage(t)}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors"
                  style={{ background: '#F9F9FB', color: '#334155' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3EEFF'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F9F9FB'}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 flex items-center gap-2 shrink-0"
          style={{ borderTop: '1px solid #F1F5F9', background: '#fff' }}>
          {!selected.botActive && (
            <span className="text-[10px] px-2 py-1 rounded-full font-medium shrink-0"
              style={{ background: '#fff3cd', color: '#92400e' }}>
              Manual
            </span>
          )}
          {/* Botón plantillas */}
          <button
            onClick={() => setShowTemplates(v => !v)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0"
            style={{ background: showTemplates ? '#F3EEFF' : '#F9F9FB', border: '1px solid #ede9fe' }}
            title="Plantillas"
          >
            <span style={{ fontSize: 14 }}>⚡</span>
          </button>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={selected.botActive ? 'Escribí para intervenir…' : 'Respondé como staff…'}
            className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: '#F9F9FB', border: '1px solid #ede9fe', color: '#0f172a' }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: input.trim() ? '#601EF9' : '#ede9fe' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════
          COL 3 — Panel de contexto
      ══════════════════════════════ */}
      <div className="w-60 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderLeft: '1px solid #F1F5F9' }}>
        <div className="p-4 space-y-4">

          {/* A. Cliente */}
          <div>
            <div className="flex flex-col items-center text-center mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white mb-2"
                style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                {selected.avatar}
              </div>
              <p className="text-sm font-bold leading-tight" style={{ color: '#0f172a' }}>{selected.name}</p>
              {selected.district && (
                <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>📍 {selected.district}</p>
              )}
              <p className="text-[11px]" style={{ color: '#94a3b8' }}>{selected.phone}</p>
            </div>
          </div>

          <Divider />

          {/* B. Mascotas */}
          <CtxSection label="Mascotas">
            {selected.pets.map(pet => {
              const st = PET_STATUS[pet.status ?? 'ok']
              return (
                <div key={pet.name} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl mb-1.5"
                  style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{PET_EMOJI[pet.species] ?? '🐾'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{pet.name}</p>
                      <p className="text-[10px]" style={{ color: '#94a3b8' }}>{pet.breed}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </CtxSection>

          <Divider />

          {/* C. Estado operativo */}
          <CtxSection label="Estado operativo">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                style={{ background: selected.hasActiveService ? '#f0fdf4' : '#F9F9FB', border: '1px solid #e2e8f0' }}>
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: selected.hasActiveService ? '#10b981' : '#cbd5e1' }} />
                <span className="text-[11px] font-medium" style={{ color: selected.hasActiveService ? '#166534' : '#94a3b8' }}>
                  {selected.hasActiveService ? 'Servicio activo hoy' : 'Sin servicio hoy'}
                </span>
              </div>
              {selected.assignedRoute && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                  style={{ background: '#F3EEFF', border: '1px solid #ddd6fe' }}>
                  <span className="text-sm">🛵</span>
                  <span className="text-[11px] font-medium" style={{ color: '#601EF9' }}>{selected.assignedRoute}</span>
                </div>
              )}
              {selected.lastBooking && (
                <div className="px-2.5 py-2 rounded-xl" style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Último turno</p>
                  <p className="text-[11px] font-medium" style={{ color: '#334155' }}>{selected.lastBooking}</p>
                </div>
              )}
            </div>
          </CtxSection>

          <Divider />

          {/* D. Acciones rápidas */}
          <CtxSection label="Acciones">
            <div className="space-y-1.5">
              <Link href="/bookings">
                <CtxBtn icon="📅" label="Agendar servicio" primary />
              </Link>
              <CtxBtn icon="🛵" label="Agregar a ruta"
                onClick={() => alert('Asignación de ruta — próximamente')} />
              <CtxBtn icon="📨" label="Enviar recordatorio"
                onClick={() => {
                  const text = encodeURIComponent(`Hola ${selected.name}! Te recordamos que tenés un turno pendiente. 🐾`)
                  window.open(`https://wa.me/${selected.phone.replace(/\D/g, '')}?text=${text}`, '_blank')
                }}
              />
              <CtxBtn icon="✅" label="Marcar como resuelto"
                onClick={() => markResolved(selected.id)} />
            </div>
          </CtxSection>

        </div>
      </div>

    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────
function CtxSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid #F1F5F9' }} />
}

function CtxBtn({ icon, label, onClick, primary }: {
  icon: string; label: string; onClick?: () => void; primary?: boolean
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl transition-colors"
      style={primary
        ? { background: '#601EF9', color: '#fff' }
        : { background: '#F1F5F9', color: '#334155' }}
      onMouseEnter={e => { if (!primary) e.currentTarget.style.background = '#F3EEFF'; if (!primary) e.currentTarget.style.color = '#601EF9' }}
      onMouseLeave={e => { if (!primary) e.currentTarget.style.background = '#F1F5F9'; if (!primary) e.currentTarget.style.color = '#334155' }}
    >
      <span>{icon}</span> {label}
    </button>
  )
}
