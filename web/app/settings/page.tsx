'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CLINIC_NAME_STORAGE_KEY } from '@/hooks/useClinicName'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'negocio' | 'qr' | 'bot' | 'notificaciones' | 'cuenta'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'negocio',        label: 'Datos del negocio',    icon: '🏥' },
  { id: 'qr',             label: 'QR & Registro',         icon: '📲' },
  { id: 'bot',            label: 'Bot',                   icon: '🤖' },
  { id: 'notificaciones', label: 'Notificaciones',         icon: '🔔' },
  { id: 'cuenta',         label: 'Cuenta',                 icon: '👤' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('negocio')
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: '#F3EEFF' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all"
            style={
              activeTab === t.id
                ? { background: '#601EF9', color: '#ffffff', boxShadow: '0 2px 8px rgba(96,30,249,0.25)' }
                : { background: 'transparent', color: '#64748b' }
            }
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {activeTab === 'negocio'        && <TabNegocio />}
      {activeTab === 'qr'             && <TabQR />}
      {activeTab === 'bot'            && <TabBot />}
      {activeTab === 'notificaciones' && <TabNotificaciones />}
      {activeTab === 'cuenta'         && <TabCuenta router={router} />}

    </div>
  )
}

// ─── TAB: Datos del negocio ───────────────────────────────────────────────────
function TabNegocio() {
  const [saved, setSaved] = useState(false)
  const [name, setName]   = useState(() => {
    if (typeof window === 'undefined') return 'VetPlace'
    return localStorage.getItem(CLINIC_NAME_STORAGE_KEY) ?? 'VetPlace'
  })
  const [form, setForm] = useState({
    address:  '',
    phone:    '',
    email:    '',
    schedule: 'Lunes a Viernes 9:00–18:00',
    tz:       'America/Argentina/Buenos_Aires',
  })

  const handleSave = () => {
    localStorage.setItem(CLINIC_NAME_STORAGE_KEY, name.trim() || 'VetPlace')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    // Fuerza re-render del sidebar en próxima navegación
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <Card title="Datos del negocio" subtitle="Esta información aparece en el sistema y en las comunicaciones con clientes.">
      {/* Logo upload placeholder */}
      <div className="flex items-center gap-5 mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
          style={{ background: '#F3EEFF', border: '2px dashed #c4b5fd' }}
        >
          <Image src="/logo.png" alt="Logo" width={72} height={72} style={{ objectFit: 'contain' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Logo de la clínica</p>
          <p className="text-xs mt-0.5 mb-2" style={{ color: '#94a3b8' }}>PNG o SVG, máx. 2 MB</p>
          <button
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#F3EEFF', color: '#601EF9' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ede9fe')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#F3EEFF')}
          >
            Cambiar logo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre de la clínica *" value={name} onChange={setName} placeholder="Ej: Veterinaria San Roque" />
        <Field label="Teléfono principal" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+54 9 11 XXXX-XXXX" />
        <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Av. Corrientes 1234, CABA" />
        <Field label="Email de contacto" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="contacto@mivetrinaria.com" type="email" />
        <Field label="Horario de atención" value={form.schedule} onChange={(v) => setForm({ ...form, schedule: v })} placeholder="Lunes a Viernes 9:00–18:00" />
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Zona horaria</label>
          <select
            value={form.tz}
            onChange={(e) => setForm({ ...form, tz: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
          >
            <option value="America/Argentina/Buenos_Aires">Argentina (ART, UTC-3)</option>
            <option value="America/Lima">Perú (PET, UTC-5)</option>
            <option value="America/Bogota">Colombia (COT, UTC-5)</option>
            <option value="America/Mexico_City">México (CST, UTC-6)</option>
            <option value="America/Santiago">Chile (CLT, UTC-3/-4)</option>
          </select>
        </div>
      </div>

      <SaveBtn onSave={handleSave} saved={saved} />
    </Card>
  )
}

// ─── TAB: QR & Registro ──────────────────────────────────────────────────────
function TabQR() {
  const { user } = useAuth()
  const clinicId = user?.user_metadata?.clinic_id as string | undefined

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'https://tuapp.com')
  const joinUrl   = clinicId ? `${appUrl}/join/${clinicId}` : null
  const qrUrl     = joinUrl  ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}&bgcolor=ffffff&color=601EF9&qzone=2` : null
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    if (!joinUrl) return
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!clinicId) {
    return (
      <Card title="QR de registro" subtitle="Tu código QR para nuevos clientes">
        <div className="flex flex-col items-center py-10 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-center" style={{ color: '#64748b' }}>
            Primero completá los datos del negocio para generar tu QR.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card title="QR de registro" subtitle="Compartí este QR o link con tus clientes para que registren sus mascotas directamente en tu clínica.">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* QR */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          {qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="QR de registro"
              width={220}
              height={220}
              className="rounded-2xl shadow-md"
              style={{ border: '4px solid #F3EEFF' }}
            />
          )}
          <button
            onClick={() => qrUrl && window.open(qrUrl + '&format=png', '_blank')}
            className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ background: '#F3EEFF', color: '#601EF9' }}
          >
            Descargar QR
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>Link de registro</p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
                style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#601EF9' }}
              >
                {joinUrl}
              </div>
              <button
                onClick={copyLink}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-colors"
                style={{ background: copied ? '#ecfdf5' : '#F3EEFF', color: copied ? '#10b981' : '#601EF9' }}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold" style={{ color: '#334155' }}>¿Cómo funciona?</p>
            <Step n="1" text="El cliente escanea el QR con su celular" />
            <Step n="2" text="Completa su nombre, teléfono y datos de su mascota" />
            <Step n="3" text="El registro queda vinculado automáticamente a tu clínica" />
            <Step n="4" text="Podés verlo en la sección Clientes" />
          </div>

          <div
            className="px-4 py-3 rounded-xl text-xs"
            style={{ background: '#F3EEFF', color: '#601EF9' }}
          >
            💡 Imprimí el QR y colocalo en tu recepción, o compartí el link por WhatsApp
          </div>
        </div>
      </div>
    </Card>
  )
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
        style={{ background: '#601EF9' }}
      >
        {n}
      </span>
      <p className="text-xs" style={{ color: '#64748b' }}>{text}</p>
    </div>
  )
}

// ─── TAB: Instrucciones del bot ───────────────────────────────────────────────
function TabBot() {
  const [saved, setSaved] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [instructions, setInstructions] = useState(
    `Eres el asistente virtual de la clínica veterinaria. Tu función es:
- Responder consultas sobre turnos, horarios y servicios.
- Confirmar o cancelar turnos cuando el cliente lo pide.
- Dar información básica sobre vacunas, baños y consultas.
- No dar diagnósticos médicos ni indicaciones de medicamentos.
- Siempre ser amable, claro y conciso.
- Si no podés resolver algo, derivar al personal de la clínica.

Idioma: español. Tono: profesional pero cercano.`
  )
  const [tone, setTone]             = useState('profesional')
  const [autoReply, setAutoReply]   = useState(true)
  const [offHours, setOffHours]     = useState(true)
  const [offMsg, setOffMsg]         = useState(
    'Hola! Estamos fuera del horario de atención. Te respondemos a la brevedad. 🐾'
  )

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Card title="Instrucciones del bot" subtitle="Configurá cómo responde el asistente de WhatsApp a tus clientes.">
      <div className="space-y-5">
        {/* Prompt principal */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold" style={{ color: '#334155' }}>Instrucciones del sistema (prompt)</label>
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>{instructions.length} caracteres</span>
          </div>
          <textarea
            ref={textRef}
            rows={10}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono leading-relaxed"
            style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
            onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
            onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
          />
          <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
            Este texto se envía como contexto al modelo de IA. Sé específico para mejores respuestas.
          </p>
        </div>

        {/* Tono */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Tono de respuesta</label>
          <div className="flex gap-2 flex-wrap">
            {['profesional', 'amigable', 'formal', 'divertido'].map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors"
                style={
                  tone === t
                    ? { background: '#601EF9', color: '#fff' }
                    : { background: '#F1F5F9', color: '#64748b' }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle auto-reply */}
        <Toggle
          label="Respuesta automática"
          desc="El bot responde automáticamente los mensajes entrantes"
          value={autoReply}
          onChange={setAutoReply}
        />

        {/* Fuera de horario */}
        <Toggle
          label="Mensaje fuera de horario"
          desc="Respuesta automática cuando el cliente escribe fuera del horario de atención"
          value={offHours}
          onChange={setOffHours}
        />
        {offHours && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Mensaje fuera de horario</label>
            <textarea
              rows={2}
              value={offMsg}
              onChange={(e) => setOffMsg(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
              onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
              onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
            />
          </div>
        )}
      </div>

      <SaveBtn onSave={handleSave} saved={saved} />
    </Card>
  )
}

// ─── TAB: Notificaciones ──────────────────────────────────────────────────────
function TabNotificaciones() {
  const [saved, setSaved]             = useState(false)
  const [remindH, setRemindH]         = useState('24')
  const [remindWA, setRemindWA]       = useState(true)
  const [groomingAlert, setGrooming]  = useState(true)
  const [vacunaAlert, setVacuna]      = useState(true)
  const [overdueAlert, setOverdue]    = useState(true)

  return (
    <Card title="Notificaciones" subtitle="Controlá qué alertas se envían y cuándo.">
      <div className="space-y-5">
        <Toggle
          label="Recordatorio de turno por WhatsApp"
          desc="Enviar un mensaje al cliente antes del turno"
          value={remindWA}
          onChange={setRemindWA}
        />
        {remindWA && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>
              Anticipación del recordatorio
            </label>
            <select
              value={remindH}
              onChange={(e) => setRemindH(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
            >
              <option value="2">2 horas antes</option>
              <option value="12">12 horas antes</option>
              <option value="24">24 horas antes</option>
              <option value="48">48 horas antes</option>
            </select>
          </div>
        )}

        <div className="h-px" style={{ background: '#F1F5F9' }} />

        <Toggle
          label="Alerta de grooming próximo"
          desc="Notificar cuando una mascota tiene baño programado"
          value={groomingAlert}
          onChange={setGrooming}
        />
        <Toggle
          label="Alerta de vacunas"
          desc="Notificar cuando una vacuna está por vencer"
          value={vacunaAlert}
          onChange={setVacuna}
        />
        <Toggle
          label="Alerta de eventos vencidos"
          desc="Notificar al staff cuando hay eventos sin completar"
          value={overdueAlert}
          onChange={setOverdue}
        />
      </div>

      <SaveBtn
        onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}
        saved={saved}
      />
    </Card>
  )
}

// ─── TAB: Cuenta ──────────────────────────────────────────────────────────────
function TabCuenta({ router }: { router: ReturnType<typeof useRouter> }) {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved]   = useState(false)
  const [profileError, setProfileError]   = useState<string | null>(null)

  const meta = user?.user_metadata ?? {}

  const [fullName,  setFullName]  = useState<string>(meta.full_name  ?? '')
  const [clinicName, setClinicName] = useState<string>(meta.clinic_name ?? '')
  const [phone,     setPhone]     = useState<string>(meta.phone      ?? '')
  const [newPass,   setNewPass]   = useState('')
  const [confPass,  setConfPass]  = useState('')

  const handleSaveProfile = async () => {
    setProfileError(null)
    setSavingProfile(true)

    const updates: Record<string, string> = {
      full_name:   fullName.trim(),
      clinic_name: clinicName.trim(),
      phone:       phone.trim(),
    }

    const { error: metaError } = await supabase.auth.updateUser({ data: updates })
    if (metaError) { setProfileError(metaError.message); setSavingProfile(false); return }

    if (clinicName.trim()) {
      localStorage.setItem(CLINIC_NAME_STORAGE_KEY, clinicName.trim())
      window.dispatchEvent(new Event('storage'))
    }

    if (newPass) {
      if (newPass !== confPass) { setProfileError('Las contraseñas no coinciden.'); setSavingProfile(false); return }
      if (newPass.length < 6)  { setProfileError('Mínimo 6 caracteres.'); setSavingProfile(false); return }
      const { error: passError } = await supabase.auth.updateUser({ password: newPass })
      if (passError) { setProfileError(passError.message); setSavingProfile(false); return }
    }

    setProfileSaved(true)
    setSavingProfile(false)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-4">
      {/* Perfil */}
      <Card title="Perfil de administrador" subtitle="Estos datos aparecen en el sistema y en las comunicaciones.">
        {/* Email (solo lectura) */}
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB' }}>
          <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Email</span>
          <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{user?.email ?? '—'}</span>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#ecfdf5', color: '#10b981' }}>Verificado</span>
        </div>

        {profileError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {profileError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre completo"       value={fullName}   onChange={setFullName}   placeholder="Tu nombre" />
          <Field label="Nombre de la clínica"  value={clinicName} onChange={setClinicName} placeholder="Veterinaria San Roque" />
          <Field label="Teléfono"              value={phone}      onChange={setPhone}      placeholder="+54 9 11 XXXX-XXXX" type="tel" />
          <div /> {/* spacer */}
          <Field label="Nueva contraseña"      value={newPass}    onChange={setNewPass}    placeholder="Dejar vacío para no cambiar" type="password" />
          <Field label="Confirmar contraseña"  value={confPass}   onChange={setConfPass}   placeholder="Repetí la contraseña" type="password" />
        </div>
        <SaveBtn onSave={handleSaveProfile} saved={profileSaved} loading={savingProfile} label="Guardar perfil" />
      </Card>

      {/* Plan */}
      <Card title="Plan actual" subtitle="">
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: '#F3EEFF', border: '1px solid #ede9fe' }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: '#601EF9' }}>Plan Free</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Hasta 50 clientes · 1 usuario</p>
          </div>
          <button
            className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity"
            style={{ background: 'linear-gradient(135deg, #3b10b5, #601EF9)' }}
          >
            Mejorar plan
          </button>
        </div>
      </Card>

      {/* Zona peligrosa */}
      <Card title="Zona de peligro" subtitle="Acciones irreversibles para la cuenta.">
        <div className="space-y-3">

          {/* Cerrar sesión */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Cerrar sesión</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Salir de tu cuenta en este dispositivo</p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#dc2626', color: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
            >
              Cerrar sesión
            </button>
          </div>

          {/* Eliminar cuenta */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: '#fff', border: '1px solid #fecaca' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Eliminar cuenta</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Borra todos los datos permanentemente</p>
            </div>
            <button
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </Card>

      {/* Confirm modal logout */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <p className="text-base font-bold mb-1" style={{ color: '#0f172a' }}>¿Cerrar sesión?</p>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>Serás redirigido a la pantalla de inicio.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F1F5F9', color: '#334155' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#dc2626' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
        onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
        onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
      />
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
        style={{ background: value ? '#601EF9' : '#E5E7EB' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function SaveBtn({ onSave, saved, loading = false, label = 'Guardar cambios' }: {
  onSave: () => void; saved: boolean; loading?: boolean; label?: string
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
        style={{ background: 'linear-gradient(135deg, #3b10b5, #601EF9)', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Guardando…' : label}
      </button>
      {saved && (
        <span className="text-xs font-medium" style={{ color: '#10b981' }}>✓ Guardado</span>
      )}
    </div>
  )
}
