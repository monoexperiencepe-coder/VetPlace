'use client'

import { ConfirmProvider } from '@/context/ConfirmContext'
import { ToastProvider } from '@/context/ToastContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  )
}
