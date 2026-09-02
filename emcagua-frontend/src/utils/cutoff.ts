export function getFirstFriday(year: number, month: number): Date {
  const d = new Date(year, month, 1)
  const day = d.getDay()
  const offset = (5 - day + 7) % 7
  d.setDate(1 + offset)
  return d
}

export function getNextCutoff(from: Date = new Date()): Date {
  const y = from.getFullYear()
  const m = from.getMonth()
  const firstFriday = getFirstFriday(y, m)
  if (from <= firstFriday) return firstFriday
  const nextMonth = m === 11 ? 0 : m + 1
  const nextYear = m === 11 ? y + 1 : y
  return getFirstFriday(nextYear, nextMonth)
}

export function getGenerationDate(cutoff: Date): Date {
  const d = new Date(cutoff)
  d.setDate(d.getDate() - 14)
  return d
}

export function formatCutoff(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
