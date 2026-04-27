'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { CLINIC_NAME_STORAGE_KEY } from '@/hooks/useClinicName'

interface FormData {
  fullName:    string
  clinicName:  string
  phone:       string
  email:       string
  password:    string
  confirmPass: string
}

const EMPTY: FormData = {
  fullName: '', clinicName: '', phone: '', email: '', password: '', confirmPass: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm]           = useState<FormData>(EMPTY)
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState(false)

  const set = (k: keyof FormData) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPass) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email:    form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name:   form.fullName.trim(),
          clinic_name: form.clinicName.trim(),
          phone:       form.phone.trim(),
        },
      },
    })

    if (signUpError) {
      // Mapear mensajes de Supabase a español
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('Ya existe una cuenta con ese email. Iniciá sesión.')
      } else if (msg.includes('password')) {
        setError('La contraseña no cumple los requisitos mínimos.')
      } else if (msg.includes('invalid') && msg.includes('email')) {
        setError('El email ingresado no es válido.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // Persistir nombre de clínica en localStorage (siempre, independiente de la sesión)
    if (form.clinicName.trim()) {
      localStorage.setItem(CLINIC_NAME_STORAGE_KEY, form.clinicName.trim())
    }

    // Si hay sesión activa (confirmación de email desactivada), crear clínica ahora
    const session = signUpData?.session
    if (session) {
      try {
        const clinic = await api.setupClinic({
          name:  form.clinicName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim(),
        }) as { ok: boolean; data: { id: string; name: string } }

        const clinicData = clinic?.data ?? (clinic as unknown as { id: string; name: string })
        if (clinicData?.id) {
          await supabase.auth.updateUser({
            data: { clinic_id: clinicData.id, clinic_name: clinicData.name },
          })
        }
      } catch {
        // No bloqueamos el flujo — se completa en Settings
      }
      window.location.href = '/onboarding'
    } else {
      // Email de confirmación enviado — mostrar mensaje en vez de redirigir
      setLoading(false)
      setError('')
      // Reutilizamos el estado de error para mostrar un mensaje de éxito
      // (hacemos un estado separado para esto)
      setPendingConfirm(true)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#F4F4F8' }}
    >
      <div
        className="w-full max-w-[940px] flex rounded-3xl overflow-hidden shadow-2xl"
        style={{ minHeight: 600 }}
      >

        {/* ── Panel izquierdo: formulario ── */}
        <div className="flex-1 bg-white flex flex-col justify-between px-10 py-10 overflow-y-auto">
          <div>
            <Image src="/logo.png" alt="VetPlace" width={148} height={42} priority style={{ objectFit: 'contain' }} />
          </div>

          {pendingConfirm && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 py-12 text-center">
              <span className="text-5xl">📧</span>
              <div>
                <p className="text-lg font-bold" style={{ color: '#0f172a' }}>¡Revisá tu email!</p>
                <p className="text-sm mt-2" style={{ color: '#64748b' }}>
                  Te enviamos un link de confirmación a <strong>{form.email}</strong>.
                  <br />Una vez confirmado podés iniciar sesión.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#3b10b5,#601EF9)' }}
              >
                Ir al login →
              </Link>
            </div>
          )}

          {!pendingConfirm && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Crear cuenta</h1>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                Completá los datos de tu clínica para empezar
              </p>
            </div>

            {/* Error global */}
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            {/* Grid 2 cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Nombre completo *"
                value={form.fullName}
                onChange={set('fullName')}
                placeholder="Juan Pérez"
                required
              />
              <Field
                label="Nombre de la clínica *"
                value={form.clinicName}
                onChange={set('clinicName')}
                placeholder="Veterinaria San Roque"
                required
              />
              <Field
                label="Teléfono"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+54 9 11 XXXX-XXXX"
                type="tel"
              />
              <Field
                label="Email *"
                value={form.email}
                onChange={set('email')}
                placeholder="juan@mivetrinaria.com"
                type="email"
                required
              />
              <Field
                label="Contraseña *"
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 6 caracteres"
                type={showPass ? 'text' : 'password'}
                required
                rightEl={
                  <button type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
              <Field
                label="Confirmar contraseña *"
                value={form.confirmPass}
                onChange={set('confirmPass')}
                placeholder="Repetí la contraseña"
                type={showPass ? 'text' : 'password'}
                required
              />
            </div>

            {/* TyC */}
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              Al crear una cuenta aceptás los{' '}
              <span className="font-semibold" style={{ color: '#601EF9' }}>Términos de servicio</span>
              {' '}y la{' '}
              <span className="font-semibold" style={{ color: '#601EF9' }}>Política de privacidad</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #3b10b5 0%, #601EF9 100%)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
          )}

          <div className="mt-6 flex flex-col items-center gap-1">
            <p className="text-sm" style={{ color: '#64748b' }}>
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: '#601EF9' }}>
                Iniciar sesión
              </Link>
            </p>
            <p className="text-[11px] mt-2" style={{ color: '#c8c8d0' }}>
              © {new Date().getFullYear()} VetPlace. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* ── Panel derecho: branding ── */}
        <div
          className="hidden md:flex w-[40%] shrink-0 flex-col items-center justify-center relative overflow-hidden px-8"
          style={{ background: 'linear-gradient(145deg, #3b10b5 0%, #601EF9 55%, #7c3aff 100%)' }}
        >
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-10"
            style={{ background: '#fff' }} />

          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <span style={{ fontSize: 64 }}>🐾</span>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-[220px]">
              <FeaturePill icon="⚡" text="Setup en menos de 2 min" />
              <FeaturePill icon="📅" text="Gestión de turnos online" />
              <FeaturePill icon="💬" text="Bot de WhatsApp incluido" />
              <FeaturePill icon="📊" text="Dashboard con métricas" />
            </div>

            <div>
              <p className="text-white text-lg font-bold leading-snug">
                Empezá gratis hoy
              </p>
              <p className="text-sm mt-2" style={{ color: '#c4b5fd' }}>
                Sin tarjeta de crédito.<br />Sin compromisos.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', required, rightEl,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
  rightEl?: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: '#F9F9FB',
            border: '1.5px solid #E5E7EB',
            color: '#0f172a',
            paddingRight: rightEl ? '2.5rem' : undefined,
          }}
          onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
          onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
        />
        {rightEl && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</span>
        )}
      </div>
    </div>
  )
}

function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}
    >
      <span>{icon}</span><span>{text}</span>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}
