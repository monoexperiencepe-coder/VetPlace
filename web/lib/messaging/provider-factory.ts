// ─── Message Provider Factory ─────────────────────────────────────────────────
// Single point of selection for the active messaging provider.
// To add WhatsApp: create WhatsAppProvider, set channel === 'whatsapp' below.

import { InternalProvider } from './internal-provider'
import type { MessageChannel, MessageProvider } from './message-provider'

export function getMessageProvider(channel?: MessageChannel): MessageProvider {
  switch (channel) {
    case 'whatsapp':
      // TODO: return new WhatsAppCloudProvider() once credentials are configured
      // For now, fall through to internal simulation
      return new InternalProvider()

    case 'internal':
    default:
      return new InternalProvider()
  }
}
