import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DentalPlace — Gestión para clínicas dentales',
  description: 'Sistema de gestión para odontología y clínicas dentales',
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
