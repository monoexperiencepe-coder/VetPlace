import type { EventWithPetAndUser } from '../types'
import { diffDays, todayUTC } from '../utils/dateUtils'

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
  // const res = await fetch(
  //   `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       messaging_product: 'whatsapp',
  //       to: phone,
  //       type: 'text',
  //       text: { body: message },
  //     }),
  //   }
  // )
  // const json = await res.json()
  // return { success: res.ok, messageId: json.messages?.[0]?.id }

  console.log(`[WhatsApp STUB] → ${phone}`)
  console.log(`  Mensaje: ${message}`)
  return { success: true, messageId: `stub_${Date.now()}` }
}
