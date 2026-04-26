'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive = botón principal rojo (cancelar cita, etc.) */
  variant?: 'danger' | 'default'
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setDialog(opts)
    })
  }, [])

  const finish = useCallback((value: boolean) => {
    setDialog(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }, [])

  const value = useMemo(() => confirm, [confirm])

  const destructive = dialog?.variant === 'danger'

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            style={{ background: 'rgba(17,28,68,0.45)' }}
            aria-label="Cerrar"
            onClick={() => finish(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: '#ffffff', border: '1px solid #e4ebff' }}
          >
            <h2 id="confirm-title" className="text-lg font-bold" style={{ color: '#0f172a' }}>
              {dialog.title}
            </h2>
            <p id="confirm-desc" className="text-sm mt-2 leading-relaxed" style={{ color: '#64748b' }}>
              {dialog.message}
            </p>
            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => finish(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#f0f4ff', color: '#334155' }}
              >
                {dialog.cancelLabel ?? 'No, volver'}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background: destructive ? '#dc2626' : 'var(--blue)',
                }}
              >
                {dialog.confirmLabel ?? 'Sí, continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
