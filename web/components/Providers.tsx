'use client'

import { ConfirmProvider } from '@/context/ConfirmContext'
import { ToastProvider }   from '@/context/ToastContext'
import { AuthProvider }    from '@/context/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
