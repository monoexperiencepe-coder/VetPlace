'use client'

import { useState } from 'react'

// ─── Mock data ────────────────────────────────────────────────────────────────
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
}

interface Client {
  id: string
  name: string
  phone: string
  avatar: string
  pets: Pet[]
  lastBooking: string | null
  unread: number
  lastMessage: string
  lastTime: string
  botActive: boolean
  messages: Message[]
}

const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Lucía Fernández',
    phone: '+54 9 11 2345-6789',
    avatar: 'LF',
    pets: [{ name: 'Luna', species: 'Perro', breed: 'Labrador' }],
    lastBooking: '28 Abr 2026 – Baño y corte',
    unread: 2,
    lastMessage: '¿A qué hora es el turno mañana?',
    lastTime: '14:32',
    botActive: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Hola! Quería confirmar el turno de mañana para Luna 🐶', time: '14:28' },
      { id: 'm2', from: 'bot',    text: 'Hola Lucía! 👋 Tu turno está confirmado para mañana a las 10:00 hs. ¿Necesitás algo más?', time: '14:29' },
      { id: 'm3', from: 'client', text: '¿A qué hora es el turno mañana?', time: '14:32' },
    ],
  },
  {
    id: '2',
    name: 'Marcos Rodríguez',
    phone: '+54 9 11 9876-5432',
    avatar: 'MR',
    pets: [
      { name: 'Milo', species: 'Gato', breed: 'Siamés' },
      { name: 'Thor', species: 'Perro', breed: 'Golden Retriever' },
    ],
    lastBooking: '25 Abr 2026 – Vacuna antirrábica',
    unread: 0,
    lastMessage: 'Perfecto, muchas gracias!',
    lastTime: 'Ayer',
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
    id: '3',
    name: 'Ana Gómez',
    phone: '+54 9 11 5544-3322',
    avatar: 'AG',
    pets: [{ name: 'Coco', species: 'Perro', breed: 'Beagle' }],
    lastBooking: null,
    unread: 1,
    lastMessage: 'Mi perro está comiendo poco, ¿puede ser algo serio?',
    lastTime: '09:15',
    botActive: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Mi perro está comiendo poco, ¿puede ser algo serio?', time: '09:15' },
    ],
  },
  {
    id: '4',
    name: 'Carlos Suárez',
    phone: '+54 9 11 7788-9900',
    avatar: 'CS',
    pets: [{ name: 'Rex', species: 'Perro', breed: 'Pastor Alemán' }],
    lastBooking: '20 Abr 2026 – Control general',
    unread: 0,
    lastMessage: 'Gracias por el recordatorio 🙏',
    lastTime: 'Lun',
    botActive: true,
    messages: [
      { id: 'm1', from: 'bot',    text: 'Hola Carlos! Te recordamos que Rex tiene turno el lunes 20 a las 11:00 hs.', time: 'Dom 18:00' },
      { id: 'm2', from: 'client', text: 'Gracias por el recordatorio 🙏', time: 'Dom 18:05' },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChatsPage() {
  const [clients, setClients]         = useState<Client[]>(MOCK_CLIENTS)
  const [selectedId, setSelectedId]   = useState<string>(MOCK_CLIENTS[0].id)
  const [input, setInput]             = useState('')
  const [search, setSearch]           = useState('')

  const selected = clients.find((c) => c.id === selectedId)!
  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const toggleBot = (id: string) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, botActive: !c.botActive } : c))
    )
  }

  const sendMessage = () => {
    if (!input.trim()) return
    const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    setClients((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              messages: [...c.messages, { id: Date.now().toString(), from: 'staff', text: input.trim(), time: now }],
              lastMessage: input.trim(),
              lastTime: now,
            }
          : c
      )
    )
    setInput('')
  }

  const markRead = (id: string) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
    setSelectedId(id)
  }

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 88px)', border: '1px solid #ede9fe', background: '#ffffff' }}
    >

      {/* ── Panel izquierdo: lista de conversaciones ── */}
      <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: '1px solid #F1F5F9' }}>
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-base font-bold mb-3" style={{ color: '#0f172a' }}>Conversaciones</h2>
          <div className="relative">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
              style={{
                background: '#F9F9FB',
                border: '1px solid #ede9fe',
                color: '#0f172a',
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => markRead(c.id)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
              style={{
                background: c.id === selectedId ? '#F3EEFF' : 'transparent',
                borderLeft: c.id === selectedId ? '3px solid #601EF9' : '3px solid transparent',
              }}
              onMouseEnter={(e) => { if (c.id !== selectedId) e.currentTarget.style.background = '#F9F9FB' }}
              onMouseLeave={(e) => { if (c.id !== selectedId) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #601EF9, #3b10b5)' }}
              >
                {c.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{c.name}</p>
                  <span className="text-[10px] shrink-0" style={{ color: '#94a3b8' }}>{c.lastTime}</span>
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{c.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Bot badge */}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={
                      c.botActive
                        ? { background: '#F3EEFF', color: '#601EF9' }
                        : { background: '#F1F5F9', color: '#94a3b8' }
                    }
                  >
                    {c.botActive ? '● Bot activo' : '○ Bot off'}
                  </span>
                  {/* Unread */}
                  {c.unread > 0 && (
                    <span
                      className="text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ background: '#601EF9' }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header del chat */}
        <div
          className="px-5 py-3.5 flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #601EF9, #3b10b5)' }}
            >
              {selected.avatar}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{selected.name}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{selected.phone}</p>
            </div>
          </div>

          {/* Bot toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: '#64748b' }}>Bot</span>
            <button
              onClick={() => toggleBot(selected.id)}
              className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ background: selected.botActive ? '#601EF9' : '#e2e8f0' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: selected.botActive ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
            <span className="text-xs font-semibold" style={{ color: selected.botActive ? '#601EF9' : '#94a3b8' }}>
              {selected.botActive ? 'Activo' : 'Desactivado'}
            </span>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: '#FAFAFC' }}>
          {selected.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[72%] ${msg.from === 'client' ? 'self-start items-start' : 'self-end items-end ml-auto'}`}
            >
              {/* Etiqueta de remitente */}
              <span className="text-[10px] mb-1 px-1 font-medium" style={{ color: '#94a3b8' }}>
                {msg.from === 'client' ? selected.name : msg.from === 'bot' ? '🤖 Bot VetPlace' : '👤 Staff'}
              </span>

              <div
                className="px-4 py-2.5 rounded-2xl text-sm"
                style={
                  msg.from === 'client'
                    ? { background: '#ffffff', border: '1px solid #ede9fe', color: '#0f172a', borderBottomLeftRadius: 4 }
                    : msg.from === 'bot'
                    ? { background: '#F3EEFF', color: '#3b10b5', borderBottomRightRadius: 4 }
                    : { background: '#601EF9', color: '#ffffff', borderBottomRightRadius: 4 }
                }
              >
                {msg.text}
              </div>
              <span className="text-[10px] mt-1 px-1" style={{ color: '#94a3b8' }}>{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 flex items-center gap-3 shrink-0"
          style={{ borderTop: '1px solid #F1F5F9', background: '#ffffff' }}
        >
          {!selected.botActive && (
            <span className="text-[10px] px-2 py-1 rounded-full font-medium shrink-0" style={{ background: '#fff3cd', color: '#92400e' }}>
              Bot desactivado – respondés vos
            </span>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Escribí un mensaje como staff..."
            className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
            style={{ background: '#F9F9FB', border: '1px solid #ede9fe', color: '#0f172a' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity"
            style={{
              background: input.trim() ? '#601EF9' : '#ede9fe',
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* ── Panel derecho: info del cliente ── */}
      <div
        className="w-64 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderLeft: '1px solid #F1F5F9' }}
      >
        <div className="p-5">
          {/* Avatar grande */}
          <div className="flex flex-col items-center text-center mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white mb-3"
              style={{ background: 'linear-gradient(135deg, #601EF9, #3b10b5)' }}
            >
              {selected.avatar}
            </div>
            <p className="font-bold text-sm" style={{ color: '#0f172a' }}>{selected.name}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{selected.phone}</p>
          </div>

          <Divider />

          {/* Mascotas */}
          <Section title="Mascotas">
            {selected.pets.map((pet) => (
              <div
                key={pet.name}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-2"
                style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}
              >
                <span className="text-lg">{pet.species === 'Gato' ? '🐱' : '🐶'}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{pet.name}</p>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>{pet.breed}</p>
                </div>
              </div>
            ))}
          </Section>

          <Divider />

          {/* Último turno */}
          <Section title="Último turno">
            {selected.lastBooking ? (
              <div className="rounded-xl px-3 py-2.5" style={{ background: '#F3EEFF' }}>
                <p className="text-xs font-medium" style={{ color: '#3b10b5' }}>{selected.lastBooking}</p>
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#94a3b8' }}>Sin turnos registrados</p>
            )}
          </Section>

          <Divider />

          {/* Acciones */}
          <Section title="Acciones rápidas">
            <button
              className="w-full text-left text-xs font-medium px-3 py-2 rounded-xl mb-1.5 transition-colors"
              style={{ background: '#F3EEFF', color: '#601EF9' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ede9fe')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F3EEFF')}
            >
              📅 Crear nuevo turno
            </button>
            <button
              className="w-full text-left text-xs font-medium px-3 py-2 rounded-xl mb-1.5 transition-colors"
              style={{ background: '#F1F5F9', color: '#334155' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F1F5F9')}
            >
              👤 Ver perfil del cliente
            </button>
            <button
              className="w-full text-left text-xs font-medium px-3 py-2 rounded-xl transition-colors"
              style={{ background: '#F1F5F9', color: '#334155' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#F1F5F9')}
            >
              🔕 Silenciar conversación
            </button>
          </Section>
        </div>
      </div>

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-4" style={{ borderTop: '1px solid #F1F5F9' }} />
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
      fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}
