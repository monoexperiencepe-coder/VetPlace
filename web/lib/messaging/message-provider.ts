// ─── Message Provider Abstraction ────────────────────────────────────────────
// Defines the channel-agnostic interface for sending messages.
// Swap the provider implementation to change the delivery channel
// without touching the automation engine or any caller.

export type MessageChannel = 'internal' | 'whatsapp'

export interface SendMessageInput {
  clinicId:  string
  to:        string    // phone number, e.g. "51999000001"
  body:      string
  channel?:  MessageChannel
  metadata?: Record<string, unknown>
}

export interface SendMessageResult {
  external_id?: string  // provider-assigned message ID (e.g. WA message id)
  status:       'sent' | 'failed'
}

export interface MessageProvider {
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>
}
