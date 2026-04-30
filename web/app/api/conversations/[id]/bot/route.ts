import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { bot_active } = body as { bot_active: boolean }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ bot_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}
