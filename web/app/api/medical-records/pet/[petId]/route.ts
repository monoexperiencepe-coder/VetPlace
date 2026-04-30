import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

// GET /api/medical-records/pet/:petId — historial de una mascota
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const { petId } = await params
    const { clinicId } = await getAuthContext(request)

    const { data, error } = await supabaseAdmin
      .from('medical_records')
      .select('*')
      .eq('pet_id', petId)
      .eq('clinic_id', clinicId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)

    return ok(data ?? [])
  } catch (e) {
    return handleRouteError(e)
  }
}
