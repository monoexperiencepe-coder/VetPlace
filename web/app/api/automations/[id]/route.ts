import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { NotFoundError, handleSupabaseError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { clinicId } = await getAuthContext(request)
    const { id } = await params
    const body = await request.json()

    const allowed: Record<string, unknown> = {}
    if (typeof body.active           === 'boolean') allowed.active           = body.active
    if (typeof body.message_template === 'string')  allowed.message_template = body.message_template
    if (typeof body.delay_minutes    === 'number')  allowed.delay_minutes    = body.delay_minutes

    const { data, error } = await supabaseAdmin
      .from('automations')
      .update({ ...allowed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Automation', id)
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
