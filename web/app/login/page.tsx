'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [showPass, setShowPass] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password,
    })

    if (signInError) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#F4F4F8' }}
    >
      <div
        className="w-full max-w-[900px] flex rounded-3xl overflow-hidden shadow-2xl"
        style={{ minHeight: 560 }}
      >

        {/* ── Panel izquierdo: formulario ── */}
        <div className="flex-1 bg-white flex flex-col justify-between px-10 py-10">
          {/* Logo */}
          <div>
            <Image src="/logo.png" alt="VetPlace" width={148} height={42} priority style={{ objectFit: 'contain' }} />
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-8">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Bienvenido de vuelta</h1>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>Ingresá a tu cuenta para continuar</p>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>
                Email
              </label>
              <div className="relative">
                <MailIcon />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@clinica.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#F9F9FB',
                    border: '1.5px solid #E5E7EB',
                    color: '#0f172a',
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
                  onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>
                Contraseña
              </label>
              <div className="relative">
                <LockIcon />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#F9F9FB',
                    border: '1.5px solid #E5E7EB',
                    color: '#0f172a',
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
                  onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Recordar / olvidé */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: '#64748b' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#601EF9]"
                />
                Recordarme
              </label>
              <button type="button" className="font-semibold hover:underline" style={{ color: '#601EF9' }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #3b10b5 0%, #601EF9 100%)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
              <span className="text-xs" style={{ color: '#94a3b8' }}>o continuar con</span>
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            </div>

            {/* Socials */}
            <div className="grid grid-cols-2 gap-3">
              <SocialBtn icon={<GoogleIcon />} label="Google" />
              <SocialBtn icon={<AppleIcon />}  label="Apple"  />
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center gap-1">
            <p className="text-sm" style={{ color: '#64748b' }}>
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="font-semibold hover:underline" style={{ color: '#601EF9' }}>
                Crear cuenta
              </Link>
            </p>
            <p className="text-[11px] mt-3" style={{ color: '#c8c8d0' }}>
              © {new Date().getFullYear()} VetPlace. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* ── Panel derecho: branding ── */}
        <div
          className="hidden md:flex w-[42%] shrink-0 flex-col items-center justify-center relative overflow-hidden px-8"
          style={{ background: 'linear-gradient(145deg, #3b10b5 0%, #601EF9 55%, #7c3aff 100%)' }}
        >
          {/* Círculos decorativos */}
          <div
            className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-10"
            style={{ background: '#ffffff' }}
          />
          <div
            className="absolute top-1/2 left-0 w-1 h-24 rounded-r-full opacity-30"
            style={{ background: '#ffffff', transform: 'translateY(-50%)' }}
          />

          {/* Contenido */}
          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            {/* Ilustración mascota */}
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <span style={{ fontSize: 64 }}>🐾</span>
            </div>

            {/* Features pill list */}
            <div className="flex flex-col gap-3 w-full max-w-[220px]">
              <FeaturePill icon="📅" text="Gestión de turnos" />
              <FeaturePill icon="💬" text="Recordatorios por WhatsApp" />
              <FeaturePill icon="🐶" text="Historial de mascotas" />
              <FeaturePill icon="📊" text="Dashboard con métricas" />
            </div>

            <div className="mt-2">
              <p className="text-white text-lg font-bold leading-snug">
                Tu clínica, siempre<br />organizada
              </p>
              <p className="text-sm mt-2" style={{ color: '#c4b5fd' }}>
                Todo lo que necesitás en<br />un solo lugar
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FeaturePill({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function SocialBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
      style={{ border: '1.5px solid #E5E7EB', color: '#334155', background: '#fff' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F9FB')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function MailIcon() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}
