'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',          label: 'Dashboard',  icon: '◈' },
  { href: '/clients',   label: 'Clientes',   icon: '👤' },
  { href: '/events',    label: 'Eventos',    icon: '📋' },
  { href: '/bookings',  label: 'Agenda',     icon: '📅' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-3 shrink-0">
      <div className="px-3 mb-8">
        <h1 className="text-xl font-bold text-indigo-600 tracking-tight">VetPlace</h1>
        <p className="text-xs text-gray-400 mt-0.5">Panel de gestión</p>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon }) => {
          const active =
          href === '/'
            ? pathname === '/'
            : pathname === href ||
              (href === '/clients' && pathname.startsWith('/pets/'))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-3">
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          VetPlace v1.0
        </div>
      </div>
    </aside>
  )
}
