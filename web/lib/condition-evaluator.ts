import type { DomainEventPayload } from '@/lib/domain-events'

/**
 * Evalúa si un payload de evento satisface la condition_json de una automation.
 *
 * condition_json es un objeto JSONB con la forma:
 *   { "field": "last_activity_at", "operator": "days_ago_gte", "value": 30 }
 *
 * Si condition_json es null/undefined/vacío → la automation siempre aplica.
 *
 * Operadores soportados:
 *   eq          — campo === valor (string/number)
 *   neq         — campo !== valor
 *   contains    — campo incluye valor (string)
 *   days_ago_gte — campo (fecha YYYY-MM-DD) está hace >= N días
 *   days_ago_lte — campo (fecha YYYY-MM-DD) está hace <= N días
 *   exists      — campo existe y no es null/undefined
 */

export interface AutomationCondition {
  field:    string
  operator: 'eq' | 'neq' | 'contains' | 'days_ago_gte' | 'days_ago_lte' | 'exists'
  value?:   unknown
}

export function evaluateCondition(
  condition: AutomationCondition | null | undefined,
  payload:   DomainEventPayload
): boolean {
  // Sin condición → siempre cumple
  if (!condition || !condition.field || !condition.operator) return true

  const raw = payload[condition.field]

  switch (condition.operator) {
    case 'exists':
      return raw !== null && raw !== undefined

    case 'eq':
      return String(raw) === String(condition.value)

    case 'neq':
      return String(raw) !== String(condition.value)

    case 'contains':
      return typeof raw === 'string' && raw.includes(String(condition.value))

    case 'days_ago_gte':
    case 'days_ago_lte': {
      if (!raw) return false
      const fieldDate = new Date(String(raw))
      if (isNaN(fieldDate.getTime())) return false
      const now  = new Date()
      const diffMs   = now.getTime() - fieldDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      const threshold = Number(condition.value)
      if (condition.operator === 'days_ago_gte') return diffDays >= threshold
      return diffDays <= threshold
    }

    default:
      return true
  }
}
