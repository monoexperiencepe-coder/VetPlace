// POST /api/messages/inbound
// ─────────────────────────────────────────────────────────────────────────────
// Simula la recepción de un mensaje entrante de WhatsApp.
// En producción este endpoint será reemplazado por el webhook real de Meta,
// que tendrá la misma lógica pero con verificación de firma HMAC.
//
// Body: { from: "51999000001", message: "Sí, agendemos" }
//
// Flujo:
//  1. Autenticar clínica (JWT Bearer)
//  2. Buscar o crear conversación para ese número
//  3. Insertar mensaje con from_type = 'user'
//  4. Emitir domain event 'message_received' → automation engine lo procesa
//     en el siguiente ciclo del cron process-events

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, err, handleRouteError } from '@/lib/api-response'
import { emitMessageReceived } from '@/lib/domain-events'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as { from?: string; message?: string }

    const from    = body.from?.trim()
    const message = body.message?.trim()

    if (!from)    return err('"from" es requerido (número de teléfono)', 400)
    if (!message) return err('"message" es requerido', 400)

    // 1. Buscar o crear conversación para este número
    const conversationId = await findOrCreateConversation(clinicId, from)

    // 2. Insertar el mensaje como si viniera del cliente
    const { data: inserted, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        from_type:       'client',
        body:            message,
        created_at:      new Date().toISOString(),
      })
      .select()
      .single()

    if (msgError) throw msgError

    // 3. Actualizar conversación (último mensaje + incrementar unread)
    //    Leer unread_count actual y sumar 1 (safe para volumen bajo de mensajes)
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('unread_count')
      .eq('id', conversationId)
      .single()

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message:    message,
        last_message_at: new Date().toISOString(),
        unread_count:    (conv?.unread_count ?? 0) + 1,
      })
      .eq('id', conversationId)

    // 4. Emitir domain event — el automation engine lo procesa en el próximo ciclo
    //    Fire-and-forget: nunca bloquea la respuesta
    void emitMessageReceived(clinicId, conversationId, from, message)

    return ok({
      message_id:      inserted.id,
      conversation_id: conversationId,
      status:          'received',
    }, 201)
  } catch (e) {
    return handleRouteError(e)
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function findOrCreateConversation(clinicId: string, phone: string): Promise<string> {
  // Intentar encontrar conversación existente
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .single()

  if (existing) return existing.id

  // Buscar si hay un cliente con ese número para linkear
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .single()

  // Crear nueva conversación
  const { data: created, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      clinic_id:   clinicId,
      phone,
      client_id:   client?.id   ?? null,
      client_name: client?.name ?? null,
      bot_active:  true,
      unread_count: 1,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create conversation for ${phone}: ${error?.message}`)
  }

  return created.id
}
