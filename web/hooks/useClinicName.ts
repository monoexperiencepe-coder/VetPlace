'use client'

import { useEffect, useState } from 'react'

/** Clave usada al registrar la veterinaria (localStorage). */
export const CLINIC_NAME_STORAGE_KEY = 'vetplace_clinic_name'

/**
 * Nombre de la clínica para el sidebar: `NEXT_PUBLIC_CLINIC_NAME` o localStorage
 * (tras crear cuenta / ajustes). Misma clave que debe setear el flujo de registro.
 */
export function useClinicName(): string {
  const [name, setName] = useState(
    () => process.env.NEXT_PUBLIC_CLINIC_NAME?.trim() || 'VetPlace'
  )

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CLINIC_NAME_STORAGE_KEY)
      if (stored?.trim()) setName(stored.trim())
    } catch {
      /* ignore */
    }
  }, [])

  return name
}
