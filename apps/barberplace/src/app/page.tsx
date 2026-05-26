'use client'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()
  // Redirect to login
  if (typeof window !== 'undefined') router.replace('/login')
  return null
}
