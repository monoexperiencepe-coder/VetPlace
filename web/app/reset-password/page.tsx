'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function ResetPasswordForm() {
  const router      = useRouter()
  const supabase    = createClient()
  const searchParams = useSearchParams()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [showPass, setShowPass]   = useState(false)

  // Supabase sends the token as a hash fragment; the SDK picks it up automatically
  // via onAuthStateChange when the page loads with the recovery link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // user is now in a temporary session — ready to update password
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F9F9FB' }}>
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm" style={{ border: '1px solid #ede9fe' }}>
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>Nueva contraseña</p>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Ingresá tu nueva contraseña para acceder.</p>
        </div>

        {success ? (
          <div className="px-4 py-4 rounded-xl text-sm font-medium text-center" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            ✓ Contraseña actualizada. Redirigiendo…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: '#F9F9FB', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: '#94a3b8' }}
              >
                {showPass ? 'Ocultar' : 'Ver'}
              </button>
            </div>

            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: '#F9F9FB', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
            />

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: '#601EF9' }}
            >
              {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
