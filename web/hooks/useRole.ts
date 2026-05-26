'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Role = 'owner' | 'staff' | 'loading'

/**
 * Determines whether the current authenticated user is the clinic owner.
 *
 * Logic:
 *  - Owner  → the user whose auth.uid() matches clinics.owner_id
 *  - Staff  → any other authenticated user (invited via staff_members table)
 *  - loading → still fetching
 *
 * This requires NO extra DB tables for the basic case:
 * the owner is simply the person who created the clinic.
 */
export function useRole(): { role: Role; isOwner: boolean; isStaff: boolean } {
  const [role, setRole] = useState<Role>('loading')

  useEffect(() => {
    let cancelled = false

    async function detect() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setRole('staff'); return }

        // Check if this user owns a clinic
        const { data: clinic } = await supabase
          .from('clinics')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!cancelled) setRole(clinic ? 'owner' : 'staff')
      } catch {
        if (!cancelled) setRole('staff') // fail safe — never lock owner out
      }
    }

    detect()
    return () => { cancelled = true }
  }, [])

  return {
    role,
    isOwner: role === 'owner',
    isStaff: role === 'staff',
  }
}
