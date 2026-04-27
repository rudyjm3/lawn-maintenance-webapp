export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export function addUtcDaysToIso(isoDate: string, days: number): string {
  return formatUtcDate(addUtcDays(parseUtcDate(isoDate), days))
}

export function todayUtc(): string {
  return formatUtcDate(new Date())
}

export function startOfWeekUtc(date: Date): Date {
  const utc = parseUtcDate(formatUtcDate(date))
  const day = utc.getUTCDay()
  const offset = day === 0 ? -6 : 1 - day
  return addUtcDays(utc, offset)
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}
