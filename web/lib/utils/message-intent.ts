// ─── Message Intent Detector ──────────────────────────────────────────────────
// Classifica la intención de un mensaje entrante.
// Diseñado para ser extendido con NLP en el futuro sin romper callers.

export type MessageIntent = 'confirm' | 'cancel' | 'request_slot' | 'unknown'

// Keywords que requieren word boundary (evitan falsos positivos: "no" en "turno", etc.)
const CANCEL_KEYWORDS_EXACT  = ['no', 'nop', 'nope']
const CANCEL_KEYWORDS_SUBSTR = ['cancel', 'no puedo', 'no quiero', 'para otro', 'otro dia', 'otro día']

// Keywords de confirmación explícita (respuesta a una pregunta)
const CONFIRM_KEYWORDS_EXACT  = ['si', 'sí', 'sii', 'dale', 'ok', 'okay', 'yes', 'confirmo', 'claro', 'bueno', 'perfecto', 'genial']

// Keywords de solicitud de turno (primer mensaje, sin haber preguntado aún)
const REQUEST_KEYWORDS = ['turno', 'cita', 'agendar', 'agend', 'reserva', 'quiero', 'necesito', 'baño', 'bano', 'vacuna', 'consulta']

/** Verifica si la palabra exacta aparece rodeada de no-letras */
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-záéíóúüñ])${escaped}([^a-záéíóúüñ]|$)`, 'i').test(text)
}

/**
 * Detecta la intención de un mensaje de texto.
 * - 'cancel'       → el cliente quiere cancelar o no puede
 * - 'confirm'      → respuesta afirmativa a una pregunta (sí, dale, ok…)
 * - 'request_slot' → primer contacto pidiendo turno/servicio
 * - 'unknown'      → no se pudo clasificar
 */
export function detectIntent(message: string): MessageIntent {
  const text = message.toLowerCase().trim()

  // Cancel tiene prioridad
  if (CANCEL_KEYWORDS_EXACT.some(kw  => hasWord(text, kw)))  return 'cancel'
  if (CANCEL_KEYWORDS_SUBSTR.some(kw => text.includes(kw)))  return 'cancel'

  // Confirmación explícita corta (respuesta directa)
  if (CONFIRM_KEYWORDS_EXACT.some(kw => hasWord(text, kw)))  return 'confirm'

  // Solicitud de turno/servicio (mensaje más largo con contexto)
  if (REQUEST_KEYWORDS.some(kw => text.includes(kw)))        return 'request_slot'

  return 'unknown'
}

/**
 * Formatea una lista de slots disponibles como texto para WhatsApp.
 */
export function formatSlotsMessage(slots: { label: string }[]): string {
  if (slots.length === 0) {
    return 'Por el momento no tenemos turnos disponibles en los próximos días. Te contactamos cuando se libere un horario 🙏'
  }

  const lines = slots.map(s => `• ${s.label}`).join('\n')
  return `Perfecto 🙌\nEstos son los próximos horarios disponibles:\n\n${lines}\n\nResponde con el horario que prefieras.`
}
