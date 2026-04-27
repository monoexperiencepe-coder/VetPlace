import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/join', '/reset-password']
// Rutas que requieren sesión pero no el layout principal
const AUTH_ONLY_ROUTES = ['/onboarding']

/**
 * Middleware liviano: no usa @supabase/ssr (incompatible con Turbopack).
 * La sesión de Supabase se guarda en cookies que empiezan con "sb-".
 * Si no existe ninguna, redirige a /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  // Detectar si hay una cookie de sesión de Supabase activa
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))

  const isAuthOnly = AUTH_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (isPublic) {
    // Si ya está logueado y va a login/register, redirigir al dashboard
    if (hasSession) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  // /onboarding requiere sesión pero no redirige si ya la tiene
  if (isAuthOnly) {
    if (!hasSession) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  // Ruta protegida sin sesión → login
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
