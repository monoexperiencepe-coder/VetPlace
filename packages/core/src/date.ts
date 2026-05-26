/** Format a date string to DD/MM/YYYY */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Format a time string HH:MM to 12h with am/pm */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Return how many days until a future date (negative if past) */
export function daysUntil(iso: string): number {
  const now = new Date()
  const then = new Date(iso)
  return Math.round((then.getTime() - now.getTime()) / 86_400_000)
}
