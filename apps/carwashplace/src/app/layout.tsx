import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CarWashPlace — Gestión para lavaderos de autos',
  description: 'Sistema de gestión para car wash y lavaderos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
