import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, err, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const sp = new URL(request.url).searchParams
    const limit  = Number(sp.get('limit')  ?? 50)
    const offset = Number(sp.get('offset') ?? 0)

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const body = await request.json()
    const { body: msgBody } = body as { body: string }

    if (!msgBody?.trim()) return err('body es requerido', 400)

    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({ conversation_id: conversationId, from_type: 'staff', body: msgBody.trim() })
      .select()
      .single()

    if (msgError) throw msgError

    await supabaseAdmin
      .from('conversations')
      .update({ last_message: msgBody.trim(), last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    return ok(message, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}
