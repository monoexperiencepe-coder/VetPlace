'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { CLINIC_NAME_STORAGE_KEY } from '@/hooks/useClinicName'

const ONBOARDING_DONE_KEY = 'vetplace_onboarding_done'

type Step = 1 | 2 | 3 | 4

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Progress({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Bienvenida' },
    { n: 2, label: 'Tu clínica' },
    { n: 3, label: 'Primer paciente' },
    { n: 4, label: '¡Listo!' },
  ]
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={
                step === s.n
                  ? { background: '#601EF9', color: '#fff', boxShadow: '0 0 0 4px #ede9fe' }
                  : step > s.n
                  ? { background: '#601EF9', color: '#fff' }
                  : { background: '#f1f5f9', color: '#94a3b8' }
              }
            >
              {step > s.n ? '✓' : s.n}
            </div>
            <span
              className="text-[10px] font-medium hidden sm:block"
              style={{ color: step >= s.n ? '#601EF9' : '#94a3b8' }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 h-0.5 mx-2 mb-4 transition-all"
              style={{ background: step > s.n ? '#601EF9' : '#e2e8f0' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-lg p-8"
      style={{ border: '1px solid #ede9fe' }}
    >
      {children}
    </div>
  )
}

function PrimaryBtn({
  children, onClick, disabled, loading,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)', opacity: loading ? 0.7 : 1 }}
    >
      {loading ? 'Guardando…' : children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-2xl text-sm font-semibold transition-colors"
      style={{ background: '#f8faff', color: '#601EF9' }}
      onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
      onMouseLeave={e => e.currentTarget.style.background = '#f8faff'}
    >
      {children}
    </button>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
        onFocus={e => e.currentTarget.style.border = '1.5px solid #601EF9'}
        onBlur={e  => e.currentTarget.style.border = '1.5px solid #E5E7EB'}
      />
      {hint && <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{hint}</p>}
    </div>
  )
}

// ─── Step 1: Bienvenida ───────────────────────────────────────────────────────
function Step1({ clinicName, onNext }: { clinicName: string; onNext: () => void }) {
  return (
    <Card>
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow"
          style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}
        >
          🐾
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#0f172a' }}>
          ¡Bienvenido a VetPlace!
        </h1>
        <p className="text-base font-semibold mb-1" style={{ color: '#601EF9' }}>
          {clinicName}
        </p>
        <p className="text-sm mb-8" style={{ color: '#64748b' }}>
          En 3 pasos rápidos vas a tener tu clínica lista para gestionar turnos,
          clientes y eventos desde el primer día.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '📅', label: 'Gestión de turnos' },
            { icon: '🐕', label: 'Ficha de mascotas' },
            { icon: '💬', label: 'Recordatorios' },
          ].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-2xl"
              style={{ background: '#F3EEFF' }}>
              <span className="text-2xl">{f.icon}</span>
              <span className="text-[11px] font-semibold text-center" style={{ color: '#601EF9' }}>{f.label}</span>
            </div>
          ))}
        </div>

        <PrimaryBtn onClick={onNext}>Empecemos →</PrimaryBtn>
      </div>
    </Card>
  )
}

// ─── Step 2: Datos de la clínica ──────────────────────────────────────────────
function Step2({
  initial, onNext, onBack,
}: {
  initial: { name: string; phone: string; address: string; schedule: string }
  onNext: (data: typeof initial) => void
  onBack: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleNext = async () => {
    if (!form.name.trim()) { setErr('El nombre de la clínica es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      await api.updateMyClinic({ name: form.name.trim(), phone: form.phone || undefined, address: form.address || undefined, schedule: form.schedule || undefined } as Parameters<typeof api.updateMyClinic>[0])
      localStorage.setItem(CLINIC_NAME_STORAGE_KEY, form.name.trim())
    } catch { /* si falla, igual avanzamos */ }
    setSaving(false)
    onNext(form)
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
          style={{ background: '#F3EEFF' }}>🏥</div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Datos de tu clínica</h2>
          <p className="text-xs" style={{ color: '#94a3b8' }}>Esta info aparece en tu perfil y en los recordatorios</p>
        </div>
      </div>

      <div className="space-y-3">
        <Field label="Nombre de la clínica *" value={form.name} onChange={set('name')} placeholder="Veterinaria San Roque" />
        <Field label="Teléfono de contacto" value={form.phone} onChange={set('phone')} placeholder="+54 9 11 XXXX-XXXX" type="tel" />
        <Field label="Dirección" value={form.address} onChange={set('address')} placeholder="Av. Corrientes 1234, CABA" />
        <Field
          label="Horario de atención"
          value={form.schedule}
          onChange={set('schedule')}
          placeholder="Lun–Vie 9:00–18:00 / Sáb 9:00–13:00"
          hint="Este horario se muestra a los clientes al sacar turno"
        />
      </div>

      {err && <p className="text-xs mt-3" style={{ color: '#dc2626' }}>{err}</p>}

      <div className="flex flex-col gap-2 mt-6">
        <PrimaryBtn onClick={handleNext} loading={saving}>Guardar y continuar →</PrimaryBtn>
        <GhostBtn onClick={onBack}>← Volver</GhostBtn>
      </div>
    </Card>
  )
}

// ─── Step 3: Primer paciente (opcional) ───────────────────────────────────────
function Step3({
  onNext, onSkip,
}: {
  onNext: (data: { ownerName: string; ownerPhone: string; petName: string; petType: string }) => void
  onSkip: () => void
}) {
  const [form, setForm] = useState({ ownerName: '', ownerPhone: '', petName: '', petType: 'dog' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.ownerPhone.trim()) { setErr('El teléfono es obligatorio'); return }
    if (!form.petName.trim())   { setErr('El nombre de la mascota es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const rawPhone = form.ownerPhone.trim()
      const phone = rawPhone.startsWith('+') ? rawPhone : `+51${rawPhone}`
      const client = await api.createClient({ phone, name: form.ownerName.trim() || undefined }) as { id: string }
      await api.createPet({ user_id: client.id, name: form.petName.trim(), type: form.petType })
      onNext(form)
    } catch {
      setErr('Error al guardar. Podés saltear este paso y agregar clientes desde la app.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
          style={{ background: '#F3EEFF' }}>🐕</div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Tu primer paciente</h2>
          <p className="text-xs" style={{ color: '#94a3b8' }}>Opcional — podés saltear y agregarlo después</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-2xl mb-1" style={{ background: '#F3EEFF' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#601EF9' }}>Dueño</p>
          <div className="space-y-2">
            <Field label="Teléfono *" value={form.ownerPhone} onChange={set('ownerPhone')} placeholder="+54 9 11 XXXX-XXXX" type="tel" />
            <Field label="Nombre (opcional)" value={form.ownerName} onChange={set('ownerName')} placeholder="María García" />
          </div>
        </div>

        <div className="p-3 rounded-2xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#166534' }}>Mascota</p>
          <div className="space-y-2">
            <Field label="Nombre *" value={form.petName} onChange={set('petName')} placeholder="Rex, Luna, Mochi…" />
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Especie</label>
              <select
                value={form.petType}
                onChange={e => set('petType')(e.target.value)}
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
          </div>
        </div>
      </div>

      {err && <p className="text-xs mt-2" style={{ color: '#dc2626' }}>{err}</p>}

      <div className="flex flex-col gap-2 mt-6">
        <PrimaryBtn onClick={handleCreate} loading={saving}>Agregar y continuar →</PrimaryBtn>
        <GhostBtn onClick={onSkip}>Saltear por ahora →</GhostBtn>
      </div>
    </Card>
  )
}

// ─── Step 4: ¡Listo! ─────────────────────────────────────────────────────────
function Step4({ clinicName, onDone }: { clinicName: string; onDone: () => void }) {
  return (
    <Card>
      <div className="text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 shadow"
          style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}>
          🎉
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>¡Todo listo!</h2>
        <p className="text-sm mb-6" style={{ color: '#64748b' }}>
          <strong style={{ color: '#601EF9' }}>{clinicName}</strong> está configurada y lista para operar.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: '📅', title: 'Agendar turnos', desc: 'Gestioná la agenda diaria', href: '/bookings' },
            { icon: '👥', title: 'Ver clientes', desc: 'Fichas y mascotas', href: '/clients' },
            { icon: '📋', title: 'Eventos', desc: 'Vacunas y baños', href: '/events' },
            { icon: '⚙️', title: 'Configuración', desc: 'Ajustá tu perfil', href: '/settings' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: '#F9F9FB', border: '1.5px solid #ede9fe' }}
            >
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{item.title}</p>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>{item.desc}</p>
              </div>
            </a>
          ))}
        </div>

        <PrimaryBtn onClick={onDone}>Ir al dashboard →</PrimaryBtn>
      </div>
    </Card>
  )
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [clinicName, setClinicName] = useState('tu clínica')
  const [clinicForm, setClinicForm] = useState({
    name: '', phone: '', address: '', schedule: '',
  })

  useEffect(() => {
    // Si ya completó el onboarding, redirigir al dashboard
    if (localStorage.getItem(ONBOARDING_DONE_KEY)) {
      router.replace('/')
      return
    }
    // Pre-cargar datos del usuario
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata
      const name = meta?.clinic_name || localStorage.getItem(CLINIC_NAME_STORAGE_KEY) || ''
      if (name) {
        setClinicName(name)
        setClinicForm(f => ({ ...f, name }))
      }
    })
  }, [router])

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg,#f8f4ff 0%,#F9F9FB 60%)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="font-bold text-base" style={{ color: '#601EF9' }}>VetPlace</span>
        </div>
        {step < 4 && (
          <button
            onClick={finishOnboarding}
            className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
            style={{ background: '#f1f5f9', color: '#64748b' }}
          >
            Saltear configuración
          </button>
        )}
      </header>

      {/* Progress */}
      <div className="px-6 pt-2 pb-0 max-w-lg mx-auto w-full">
        <Progress step={step} />
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-4 pb-12">
        {step === 1 && (
          <Step1
            clinicName={clinicName}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            initial={clinicForm}
            onNext={(data) => { setClinicForm(data); setClinicName(data.name); setStep(3) }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3
            onNext={() => setStep(4)}
            onSkip={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <Step4
            clinicName={clinicName}
            onDone={finishOnboarding}
          />
        )}
      </main>
    </div>
  )
}
