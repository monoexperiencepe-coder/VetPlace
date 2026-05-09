// ─── Internal Message Provider ───────────────────────────────────────────────
// Delivers messages by writing directly to the `messages` table.
// Used for simulation and development — no external API calls.
// When real WhatsApp integration is ready, swap this for WhatsAppProvider
// without changing any caller.

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { MessageProvider, SendMessageInput, SendMessageResult } from './message-provider'

export class InternalProvider implements MessageProvider {
  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    try {
      // 1. Find or create conversation for this phone + clinic
      const conversationId = await this.findOrCreateConversation(
        input.clinicId,
        input.to
      )

      // 2. Insert message as bot response
      const { error: msgError } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          from_type:       'bot',
          body:            input.body,
          created_at:      new Date().toISOString(),
        })

      if (msgError) {
        console.error('[InternalProvider] Failed to insert message:', msgError)
        return { status: 'failed' }
      }

      // 3. Update conversation summary
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message:    input.body,
          last_message_at: new Date().toISOString(),
          unread_count:    0,   // bot messages don't increase unread
        })
        .eq('id', conversationId)

      return { status: 'sent' }
    } catch (e) {
      console.error('[InternalProvider] Unexpected error:', e)
      return { status: 'failed' }
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async findOrCreateConversation(
    clinicId: string,
    phone:    string
  ): Promise<string> {
    // Try to find existing conversation
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('phone', phone)
      .single()

    if (existing) return existing.id

    // Create new conversation
    const { data: created, error } = await supabaseAdmin
      .from('conversations')
      .insert({ clinic_id: clinicId, phone, bot_active: true })
      .select('id')
      .single()

    if (error || !created) {
      throw new Error(`[InternalProvider] Failed to create conversation for ${phone}: ${error?.message}`)
    }

    return created.id
  }
}
