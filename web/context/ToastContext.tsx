'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION_MS = 4500

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, kind }])
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
      warning: (m) => show(m, 'warning'),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const colors = {
    success: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', dot: '#10b981' },
    error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' },
    info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a', dot: '#2563eb' },
    warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' },
  }[item.kind]

  return (
    <div
      className="pointer-events-auto rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 text-sm font-medium toast-in"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: colors.dot }} />
      <p className="flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100 text-lg leading-none -mt-0.5"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
