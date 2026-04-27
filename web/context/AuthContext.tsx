'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { CLINIC_NAME_STORAGE_KEY } from '@/hooks/useClinicName'

interface AuthContextValue {
  user:    User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      syncClinicName(data.user)
      setLoading(false)
    })

    // Cambios de sesión en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      syncClinicName(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(CLINIC_NAME_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Sincroniza el nombre de la clínica desde user_metadata al localStorage
function syncClinicName(user: User | null) {
  if (!user) return
  const clinicName = user.user_metadata?.clinic_name as string | undefined
  if (clinicName?.trim()) {
    try { localStorage.setItem(CLINIC_NAME_STORAGE_KEY, clinicName.trim()) } catch { /* ignore */ }
  }
}
