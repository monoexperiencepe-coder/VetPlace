'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/clients':   'Clientes',
  '/events':    'Eventos',
  '/bookings':  'Agenda',
  '/chats':     'Chats',
  '/routes':    'Rutas del día',
  '/settings':  'Configuración',
}

function getTitle(pathname: string): string {
  if (pathname.startsWith('/pets/')) return 'Detalle de mascota'
  return PAGE_TITLES[pathname] ?? 'VetPlace'
}

export default function TopBar() {
  const pathname = usePathname()
  const title    = getTitle(pathname)

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <header
      className="shrink-0 flex items-center justify-between px-7 py-4 border-b"
      style={{ background: '#ffffff', borderColor: '#e4ebff' }}
    >
      <div>
        <h1 className="text-lg font-bold leading-tight" style={{ color: '#0f172a' }}>{title}</h1>
        <p className="text-xs capitalize mt-0.5" style={{ color: '#94a3b8' }}>{dateStr}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: '#f0f4ff' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#e0e9ff')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#f0f4ff')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%)' }}
          >
            VP
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold leading-tight" style={{ color: '#0f172a' }}>VetPlace</p>
            <p className="text-xs leading-tight" style={{ color: '#94a3b8' }}>Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
