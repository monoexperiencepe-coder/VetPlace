import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await supabaseAdmin
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', id)

    return ok(null)
  } catch (e) {
    return handleRouteError(e)
  }
}
