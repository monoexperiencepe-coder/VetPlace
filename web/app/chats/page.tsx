'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Conversation, Message } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PetInfo { id: string; name: string; type: string }
interface ClientContext { id: string; name?: string; phone: string; pets: PetInfo[] }
type Filter = 'all' | 'unread' | 'pending'

const PET_EMOJI: Record<string, string> = { dog: '🐕', cat: '🐱', bird: '🐦', rabbit: '🐇', other: '🐾' }

const TEMPLATES = [
  '¡Hola! Te recordamos tu turno para mañana. 📅',
  '¿Todo bien con tu mascota tras la última visita? 🐾',
  'Tu turno está confirmado ✅',
  'Podemos reagendar el turno sin problema. ¿Qué día te viene bien?',
]

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7)  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function initials(name: string | null, phone: string): string {
  if (!name) return phone.slice(-2)
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChatsPage() {
  const toast = useToast()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [clientCtx, setClientCtx]         = useState<ClientContext | null>(null)
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [search, setSearch]               = useState('')
  const [filter, setFilter]               = useState<Filter>('all')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showNew, setShowNew]             = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations()
      setConversations(data)
      if (!selectedId && data.length > 0) setSelectedId(data[0].id)
    } catch { /* silent */ }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (!selectedId) return
    setLoadingMsgs(true)
    setMessages([])
    setClientCtx(null)

    api.getMessages(selectedId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))

    api.markRead(selectedId).catch(() => {})
    setConversations(prev =>
      prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c)
    )

    const conv = conversations.find(c => c.id === selectedId)
    if (conv?.client_id) {
      Promise.all([
        api.getClient(conv.client_id).catch(() => null),
        api.getPetsByUser(conv.client_id).catch(() => []),
      ]).then(([client, pets]) => {
        const c = client as { id: string; name?: string; phone: string } | null
        if (c) setClientCtx({ id: c.id, name: c.name, phone: c.phone, pets: pets as PetInfo[] })
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || !selectedId || sending) return
    setSending(true)
    setInput('')
    setShowTemplates(false)
    try {
      const sent = await api.sendMessage(selectedId, msg)
      setMessages(prev => [...prev, sent])
      setConversations(prev =>
        prev.map(c => c.id === selectedId ? { ...c, last_message: msg, last_message_at: sent.created_at } : c)
      )
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar')
      setInput(msg)
    } finally {
      setSending(false)
    }
  }

  const handleToggleBot = async (id: string, current: boolean) => {
    try {
      await api.toggleBot(id, !current)
      setConversations(prev => prev.map(c => c.id === id ? { ...c, bot_active: !current } : c))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar bot')
    }
  }

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || (c.client_name ?? '').toLowerCase().includes(q) || c.phone.includes(q)
    if (!matchSearch) return false
    if (filter === 'unread')  return c.unread_count > 0
    if (filter === 'pending') return c.last_message != null
    return true
  })

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0)

  return (
    <div className="flex rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 88px)', border: '1px solid #ede9fe', background: '#ffffff' }}>

      {/* ── COL 1: Lista ── */}
      <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: '1px solid #F1F5F9' }}>
        <div className="px-4 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold" style={{ color: '#0f172a' }}>Conversaciones</h2>
              {totalUnread > 0 && (
                <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: '#601EF9' }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </div>
            <button onClick={() => setShowNew(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold"
              style={{ background: '#F3EEFF', color: '#601EF9' }} title="Nueva conversación">
              +
            </button>
          </div>
          <div className="relative mb-3">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl outline-none"
              style={{ background: '#F9F9FB', border: '1px solid #ede9fe', color: '#0f172a' }} />
          </div>
          <div className="flex gap-1">
            {([['all','Todos'],['unread','No leídos'],['pending','Recientes']] as [Filter,string][]).map(([f,label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className="flex-1 py-1 rounded-lg text-[10px] font-semibold"
                style={filter === f ? { background: '#601EF9', color: '#fff' } : { background: '#F1F5F9', color: '#64748b' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="space-y-2 p-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />)}</div>}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-2" style={{ color: '#94a3b8' }}>
              <span className="text-3xl">💬</span>
              <p className="text-xs">{conversations.length === 0 ? 'Sin conversaciones' : 'Sin resultados'}</p>
            </div>
          )}
          {!loading && filtered.map(c => {
            const isSelected = c.id === selectedId
            return (
              <button key={c.id} onClick={() => { setSelectedId(c.id); setShowTemplates(false) }}
                className="w-full text-left px-3 py-3 flex items-start gap-2.5"
                style={{ background: isSelected ? '#F3EEFF' : 'transparent', borderLeft: isSelected ? '3px solid #601EF9' : '3px solid transparent' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                  {initials(c.client_name, c.phone)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold truncate" style={{ color: '#0f172a', fontWeight: c.unread_count > 0 ? 700 : 600 }}>
                      {c.client_name ?? c.phone}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.last_message_at && <span className="text-[10px]" style={{ color: '#94a3b8' }}>{fmtTime(c.last_message_at)}</span>}
                      {c.unread_count > 0 && <span className="text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: '#601EF9' }}>{c.unread_count}</span>}
                    </div>
                  </div>
                  <p className="text-[11px] truncate" style={{ color: '#64748b' }}>{c.last_message ?? 'Sin mensajes'}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block"
                    style={c.bot_active ? { background: '#F3EEFF', color: '#601EF9' } : { background: '#F1F5F9', color: '#94a3b8' }}>
                    {c.bot_active ? '🤖 Bot' : '○ Manual'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── COL 2: Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: '#94a3b8' }}>
            <span className="text-5xl">💬</span>
            <p className="text-sm font-semibold">Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="px-4 py-3 flex items-center justify-between gap-3 shrink-0" style={{ borderBottom: '1px solid #F1F5F9' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                  {initials(selected.client_name, selected.phone)}
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight" style={{ color: '#0f172a' }}>{selected.client_name ?? selected.phone}</p>
                  <p className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>{selected.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Indicador de canal — no abre WhatsApp externo, esta bandeja ES el canal */}
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl"
                  style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  WhatsApp
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium" style={{ color: '#64748b' }}>Bot</span>
                  <button onClick={() => handleToggleBot(selected.id, selected.bot_active)}
                    className="relative w-9 h-5 rounded-full" style={{ background: selected.bot_active ? '#601EF9' : '#e2e8f0' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{ transform: selected.bot_active ? 'translateX(16px)' : 'translateX(0)' }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#FAFAFC' }}>
              {loadingMsgs && <div className="flex justify-center py-10"><span className="text-sm animate-pulse" style={{ color: '#94a3b8' }}>Cargando…</span></div>}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2" style={{ color: '#94a3b8' }}>
                  <span className="text-3xl">💬</span>
                  <p className="text-xs">Sin mensajes aún</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col max-w-[72%] ${msg.from_type === 'client' ? 'self-start items-start' : 'self-end items-end ml-auto'}`}>
                  <span className="text-[10px] mb-0.5 px-1 font-medium" style={{ color: '#94a3b8' }}>
                    {msg.from_type === 'client' ? (selected.client_name ?? selected.phone) : msg.from_type === 'bot' ? '🤖 Bot' : '👤 Staff'}
                  </span>
                  <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line"
                    style={msg.from_type === 'client'
                      ? { background: '#fff', border: '1px solid #ede9fe', color: '#0f172a', borderBottomLeftRadius: 4 }
                      : msg.from_type === 'bot'
                      ? { background: '#F3EEFF', color: '#3b10b5', borderBottomRightRadius: 4 }
                      : { background: '#601EF9', color: '#fff', borderBottomRightRadius: 4 }}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] mt-0.5 px-1" style={{ color: '#94a3b8' }}>{fmtTime(msg.created_at)}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {showTemplates && (
              <div className="px-4 pb-2" style={{ background: '#fff', borderTop: '1px solid #F1F5F9' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest py-2" style={{ color: '#94a3b8' }}>Plantillas</p>
                <div className="space-y-1">
                  {TEMPLATES.map((t, i) => (
                    <button key={i} onClick={() => handleSend(t)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl"
                      style={{ background: '#F9F9FB', color: '#334155' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3EEFF'}
                      onMouseLeave={e => e.currentTarget.style.background = '#F9F9FB'}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 flex items-center gap-2 shrink-0" style={{ borderTop: '1px solid #F1F5F9', background: '#fff' }}>
              {!selected.bot_active && (
                <span className="text-[10px] px-2 py-1 rounded-full font-medium shrink-0" style={{ background: '#fff3cd', color: '#92400e' }}>Manual</span>
              )}
              <button onClick={() => setShowTemplates(v => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: showTemplates ? '#F3EEFF' : '#F9F9FB', border: '1px solid #ede9fe' }}>
                <span style={{ fontSize: 14 }}>⚡</span>
              </button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={selected.bot_active ? 'Escribí para intervenir…' : 'Respondé como staff…'}
                className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
                style={{ background: '#F9F9FB', border: '1px solid #ede9fe', color: '#0f172a' }}
                disabled={sending} />
              <button onClick={() => handleSend()} disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: input.trim() && !sending ? '#601EF9' : '#ede9fe' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── COL 3: Contexto del cliente ── */}
      {selected && (
        <div className="w-60 shrink-0 flex flex-col overflow-y-auto" style={{ borderLeft: '1px solid #F1F5F9' }}>
          <div className="p-4 space-y-4">
            {/* Avatar + nombre */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white mb-2"
                style={{ background: 'linear-gradient(135deg,#601EF9,#3b10b5)' }}>
                {initials(selected.client_name, selected.phone)}
              </div>
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{selected.client_name ?? 'Sin nombre'}</p>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: '#94a3b8' }}>{selected.phone}</p>
              {selected.client_id && (
                <Link href="/clients" className="text-[11px] mt-1.5 font-semibold px-3 py-1 rounded-lg inline-block"
                  style={{ background: '#F3EEFF', color: '#601EF9' }}>
                  Ver perfil →
                </Link>
              )}
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9' }} />

            {/* Mascotas */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Mascotas</p>
              {!clientCtx && selected.client_id && (
                <div className="space-y-1.5">{[1,2].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />)}</div>
              )}
              {(!selected.client_id || (clientCtx && clientCtx.pets.length === 0)) && (
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>Sin mascotas registradas</p>
              )}
              {clientCtx?.pets.map(pet => (
                <Link key={pet.id} href={`/pets/${pet.id}`}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl mb-1.5 hover:opacity-80 block"
                  style={{ background: '#F9F9FB', border: '1px solid #ede9fe' }}>
                  <span>{PET_EMOJI[pet.type] ?? '🐾'}</span>
                  <p className="text-xs font-semibold truncate flex-1" style={{ color: '#0f172a' }}>{pet.name}</p>
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#c4b5fd" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9' }} />

            {/* Acciones */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Acciones</p>
              <div className="space-y-1.5">
                <Link href="/bookings"><CtxBtn icon="📅" label="Agendar servicio" primary /></Link>
                {selected.client_id && (
                  <Link href="/clients"><CtxBtn icon="👤" label="Ver ficha del cliente" /></Link>
                )}
              </div>
            </div>

            {/* Indicador de canal */}
            <div className="px-3 py-2.5 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>Canal</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                <p className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>WhatsApp Cloud API</p>
              </div>
              <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                Esta bandeja es tu inbox. Los mensajes se entregan y reciben aquí.
              </p>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <NewConvModal
          onClose={() => setShowNew(false)}
          onCreated={conv => { setConversations(prev => [conv, ...prev]); setSelectedId(conv.id); setShowNew(false) }}
        />
      )}
    </div>
  )
}

// ─── NewConvModal ─────────────────────────────────────────────────────────────
function NewConvModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Conversation) => void }) {
  const toast = useToast()
  const [phone, setPhone]   = useState('')
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) { toast.warning('El teléfono es obligatorio'); return }
    setSaving(true)
    try {
      const conv = await api.createConversation({ phone: phone.trim(), client_name: name.trim() || undefined })
      toast.success('Conversación creada')
      onCreated(conv)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.4)' }}>
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-base font-bold mb-4" style={{ color: '#0f172a' }}>Nueva conversación</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Teléfono *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+51 9XX XXX XXX" required
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
              onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
              onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#334155' }}>Nombre (opcional)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Juan García"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
              onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
              onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creando…' : 'Crear'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F1F5F9', color: '#334155' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CtxBtn ───────────────────────────────────────────────────────────────────
function CtxBtn({ icon, label, onClick, primary }: { icon: string; label: string; onClick?: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl"
      style={primary ? { background: '#601EF9', color: '#fff' } : { background: '#F1F5F9', color: '#334155' }}
      onMouseEnter={e => { if (!primary) { e.currentTarget.style.background = '#F3EEFF'; e.currentTarget.style.color = '#601EF9' } }}
      onMouseLeave={e => { if (!primary) { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#334155' } }}>
      <span>{icon}</span> {label}
    </button>
  )
}
