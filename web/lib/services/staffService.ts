import { supabaseAdmin } from '@/lib/supabase-admin'
import { handleSupabaseError, NotFoundError } from '@/lib/errors'

export interface StaffMember {
  id: string
  clinic_id: string
  name: string
  role: string
  color: string
  active: boolean
  created_at: string
  updated_at?: string
}

export async function getStaffMembers(clinicId: string): Promise<StaffMember[]> {
  const { data, error } = await supabaseAdmin
    .from('staff_members')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) handleSupabaseError(error)
  return (data ?? []) as StaffMember[]
}

export async function createStaffMember(
  clinicId: string,
  body: { name: string; role?: string; color?: string }
): Promise<StaffMember> {
  const { data, error } = await supabaseAdmin
    .from('staff_members')
    .insert({ clinic_id: clinicId, ...body })
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as StaffMember
}

export async function updateStaffMember(
  id: string,
  clinicId: string,
  body: { name?: string; role?: string; color?: string; active?: boolean }
): Promise<StaffMember> {
  const { data, error } = await supabaseAdmin
    .from('staff_members')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  if (!data) throw new NotFoundError('StaffMember', id)
  return data as StaffMember
}

export async function deleteStaffMember(id: string, clinicId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('staff_members')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) handleSupabaseError(error)
}
