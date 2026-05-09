import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, err, handleRouteError } from '@/lib/api-response'
import { emitMessageReceived, emitDomainEvent, type DomainEventType } from '@/lib/domain-events'
import { processUnhandledEvents } from '@/lib/automation-engine'

async function getDevClinicId(request: NextRequest): Promise<string> {
  const devSecret = request.headers.get('x-dev-secret')
  if (devSecret && devSecret === process.env.CRON_SECRET) {
    const { data } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (!data) throw new Error('No clinic found')
    return data.id
  }
  const { getAuthContext } = await import('@/lib/api-auth')
  const { clinicId } = await getAuthContext(request)
  return clinicId
}

async function findOrCreateConversation(clinicId: string, phone: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .single()
  if (existing) return existing.id

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .single()

  const { data: created, error } = await supabaseAdmin
    .from('conversations')
    .insert({ clinic_id: clinicId, phone, client_id: client?.id ?? null, client_name: client?.name ?? null, bot_active: true, unread_count: 0 })
    .select('id')
    .single()
  if (error || !created) throw new Error('Failed to create conversation')
  return created.id
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return err('Not available in production', 403)

  try {
    const clinicId = await getDevClinicId(request)
    const body = await request.json()
    const { event_type, payload = {} } = body as { event_type?: DomainEventType; payload?: Record<string, unknown> }

    if (body.from || event_type === 'message_received') {
      const from    = (body.from    as string) ?? '51999000001'
      const message = (body.message as string) ?? 'Hola, quiero un turno'

      // 1. Find or create real conversation
      const conversationId = await findOrCreateConversation(clinicId, from)

      // 2. Insert the CLIENT message so it appears in the chat UI
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        from_type:       'client',
        body:            message,
        created_at:      new Date().toISOString(),
      })

      // 3. Update conversation last_message
      const { data: conv } = await supabaseAdmin.from('conversations').select('unread_count').eq('id', conversationId).single()
      await supabaseAdmin.from('conversations').update({
        last_message:    message,
        last_message_at: new Date().toISOString(),
        unread_count:    (conv?.unread_count ?? 0) + 1,
      }).eq('id', conversationId)

      // 4. Emit domain event with the REAL conversation id
      await emitMessageReceived(clinicId, conversationId, from, message)

    } else if (event_type && event_type !== 'skip') {
      await emitDomainEvent(clinicId, event_type, 'debug', crypto.randomUUID(), { ...payload, _debug: true })
    }

    const engineResult = await processUnhandledEvents()

    const since = new Date(Date.now() - 30_000).toISOString()
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, from_type, body, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('id, phone, message, status, scheduled_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    return ok({ event_emitted: event_type ?? 'message_received', engine: engineResult, messages_created: messages ?? [], notifications_created: notifications ?? [] })
  } catch (e) {
    return handleRouteError(e)
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return err('Not available in production', 403)

  try {
    const clinicId = await getDevClinicId(request)
    const [eventsRes, automationsRes, notificationsRes, messagesRes] = await Promise.all([
      supabaseAdmin.from('domain_events').select('id, type, entity_type, processed, created_at, payload').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('automations').select('id, name, trigger_event, active, action_type').eq('clinic_id', clinicId).order('created_at', { ascending: true }),
      supabaseAdmin.from('notifications').select('id, phone, message, status, created_at').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('messages').select('id, from_type, body, created_at').order('created_at', { ascending: false }).limit(10),
    ])
    return ok({
      domain_events:   eventsRes.data  ?? [],
      automations:     automationsRes.data ?? [],
      notifications:   notificationsRes.data ?? [],
      recent_messages: messagesRes.data ?? [],
      pending_events:  (eventsRes.data ?? []).filter((e: { processed: boolean }) => !e.processed).length,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
