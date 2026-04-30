import type { EventWithPetAndUser } from '@/lib/types'
import { diffDays, todayUTC } from '@/lib/date-utils'

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendGroomingReminder(
  event: EventWithPetAndUser
): Promise<NotificationResult> {
  const { pet } = event
  const { user } = pet
  const daysUntil = diffDays(todayUTC(), event.scheduled_date)
  const daysText =
    daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`

  const message =
    `Hola ${user.name ?? ''}! 🐾 A *${pet.name}* le toca su baño ${daysText}.\n\n` +
    `¿Lo agendamos? Responde con el horario que prefieras y te confirmamos enseguida.`

  return sendWhatsApp(user.phone, message)
}

async function sendWhatsApp(phone: string, message: string): Promise<NotificationResult> {
  // TODO: reemplazar con WhatsApp Cloud API cuando esté listo
  console.log(`[WhatsApp STUB] → ${phone}`)
  console.log(`  Mensaje: ${message}`)
  return { success: true, messageId: `stub_${Date.now()}` }
}
