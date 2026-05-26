'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',  icon: '🏠', label: 'Inicio'     },
  { href: '/clientes',   icon: '👤', label: 'Clientes'   },
  { href: '/citas',      icon: '📅', label: 'Agenda'     },
  { href: '/servicios',  icon: '✂️', label: 'Servicios'  },
  { href: '/barbers',    icon: '💈', label: 'Barberos'   },
  { href: '/reportes',   icon: '📊', label: 'Reportes'   },
  { href: '/settings',   icon: '⚙️', label: 'Config'    },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-3 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-lg">✂️</div>
        <div>
          <p className="text-sm font-bold text-gray-900">BarberPlace</p>
          <p className="text-xs text-gray-400">Mi barbería</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">BarberPlace v0.1</p>
      </div>
    </aside>
  )
}
