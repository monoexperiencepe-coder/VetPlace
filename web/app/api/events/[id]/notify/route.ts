import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { clinicId } = await getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('events')
      .update({ status: 'NOTIFIED', notified_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

        if (error) handleSupabaseError(error)
    // TODO: integrar WhatsApp aquí
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
