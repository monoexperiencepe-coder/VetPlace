export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function diffDays(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const dateA = new Date(a + 'T00:00:00Z').getTime()
  const dateB = new Date(b + 'T00:00:00Z').getTime()
  return Math.round((dateB - dateA) / msPerDay)
}

export function nextEventDate(lastDate: string, frequencyDays: number): string {
  return addDays(lastDate, frequencyDays)
}

export function isOverdue(scheduledDate: string): boolean {
  return scheduledDate < todayUTC()
}
