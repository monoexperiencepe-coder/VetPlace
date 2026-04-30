'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useClinicName } from '@/hooks/useClinicName'

// ─── Nav: Panel arriba, Chats bajo (acceso rápido) ───────────────────────────
const navSections = [
  {
    label: 'Panel',
    items: [
      { href: '/', label: 'Dashboard', icon: DashIcon },
    ],
  },
  {
    label: 'Acceso rápido',
    items: [
      { href: '/chats', label: 'Chats', icon: ChatIcon },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/clients',  label: 'Clientes',  icon: ClientIcon },
      { href: '/pets',     label: 'Mascotas',  icon: PawIcon },
      { href: '/bookings', label: 'Agenda',    icon: CalIcon },
      { href: '/routes',   label: 'Rutas',     icon: RouteIcon },
    ],
  },
  {
    label: 'Seguimiento',
    items: [
      { href: '/events',       label: 'Eventos',          icon: EventIcon },
      { href: '/automations',  label: 'Automatizaciones', icon: BoltIcon },
      { href: '/reports',      label: 'Reportes',         icon: ChartIcon },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const clinicName = useClinicName()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/chats') return pathname === '/chats' || pathname.startsWith('/chats/')
    if (href === '/pets')    return pathname === '/pets' || pathname.startsWith('/pets/')
    if (href === '/clients') return pathname === '/clients'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="w-[232px] shrink-0 flex flex-col h-screen overflow-hidden"
      style={{ background: '#ffffff', borderRight: '1px solid #E5E7EB' }}
    >
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-5">
        <Image src="/logo.png" alt="VetPlace" width={140} height={40} priority style={{ objectFit: 'contain' }} />
      </div>

      {/* ── Balance card ── */}
      <div className="mx-4 mb-5">
        <div
          className="rounded-2xl px-4 py-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #3b10b5 0%, #601EF9 60%, #7c3aff 100%)',
          }}
        >
          {/* círculo deco */}
          <div
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #ffffff, transparent 70%)' }}
          />
          <p className="text-[11px] font-medium mb-1" style={{ color: '#ddd6fe' }}>Sistema</p>
          <p className="text-white text-lg font-bold leading-tight min-h-[1.5rem]">{clinicName}</p>
          <p className="text-[11px] mt-2 font-medium" style={{ color: '#c4b5fd' }}>Clínica veterinaria</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-5' : ''}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1"
              style={{ color: '#94a3b8' }}
            >
              {section.label}
            </p>

            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-100"
                    style={{
                      background: active ? '#F3EEFF' : 'transparent',
                      color:      active ? '#601EF9' : '#334155',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = '#F1F5F9'
                        e.currentTarget.style.color = '#0f172a'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = '#334155'
                      }
                    }}
                  >
                    {/* Indicador lateral activo */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full"
                        style={{
                          height: '60%',
                          background: '#601EF9',
                        }}
                      />
                    )}

                    <Icon active={active} />
                    <span className="flex-1">{label}</span>

                    {active && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: '#601EF9', opacity: 0.5 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div
        className="px-3 pb-5 pt-4"
        style={{ borderTop: '1px solid #F1F5F9' }}
      >
        {/* Config */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: pathname === '/settings' ? '#F3EEFF' : 'transparent',
            color: pathname === '/settings' ? '#601EF9' : '#64748b',
          }}
          onMouseEnter={(e) => { if (pathname !== '/settings') { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0f172a' } }}
          onMouseLeave={(e) => { if (pathname !== '/settings') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
        >
          <GearIcon active={pathname === '/settings'} />
          Configuración
        </Link>

        {/* User row */}
        <div
          className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: '#F5F0FF' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #601EF9, #3b10b5)' }}
          >
            VP
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate" style={{ color: '#0f172a' }}>VetPlace</p>
            <p className="text-[11px] leading-tight truncate mt-0.5" style={{ color: '#94a3b8' }}>Admin</p>
          </div>
          <DotsIcon />
        </div>
      </div>
    </aside>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function DashIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClientIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CalIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function EventIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function GearIcon({ active: _ }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function BoltIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function PawIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19c-4 0-7-2.686-7-6 0-1.5.75-3 2-4m10 10c4 0 7-2.686 7-6 0-1.5-.75-3-2-4" />
      <circle cx="9"  cy="7"  r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7"  r="1.5" fill="currentColor" stroke="none" />
      <circle cx="6"  cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13c0 2.21 1.343 4 3 4s3-1.79 3-4c0-1.5-1.343-2-3-2s-3 .5-3 2z" />
    </svg>
  )
}

function RouteIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <circle cx="5"  cy="12" r="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="5"  r="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="19" r="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h4a2 2 0 002-2V7m0 10v-2a2 2 0 00-2-2H7" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
      <circle cx="12" cy="5"  r="1" fill="#94a3b8" />
      <circle cx="12" cy="12" r="1" fill="#94a3b8" />
      <circle cx="12" cy="19" r="1" fill="#94a3b8" />
    </svg>
  )
}
