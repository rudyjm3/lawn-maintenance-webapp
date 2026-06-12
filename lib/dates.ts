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

export function formatDuration(minutes: number): string {
  if (!minutes) return "0m"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatTime(iso: string | null, fallback = "--"): string {
  if (!iso) return fallback
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

// Convert a route date + minutes-since-midnight to a proper UTC ISO string,
// accounting for the business timezone so the timestamp displays correctly in
// the browser's local time (which matches the business timezone for single-location crews).
export function localMinsToUTCISO(routeDate: string, minutesSinceMidnight: number, timezone: string): string {
  const h = Math.floor(minutesSinceMidnight / 60)
  const m = minutesSinceMidnight % 60
  // Use ms arithmetic so routes past midnight (cursor >= 1440) stay valid;
  // string construction like `T25:00:00Z` would be an invalid ISO date.
  const naive = new Date(parseUtcDate(routeDate).getTime() + minutesSinceMidnight * 60_000)
  // What time does this UTC moment show in the target timezone?
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(naive)
  const tzH = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0") % 24
  const tzM = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0")
  // Clamp to ±12h to prevent date rollover for western timezones where the
  // naive UTC moment shows the previous local calendar day (e.g. 4 AM in
  // America/Chicago naively shows as 11 PM the day before, yielding a raw diff
  // of -19 hours instead of +5).
  let diffMins = (h * 60 + m) - (tzH * 60 + tzM)
  if (diffMins > 12 * 60) diffMins -= 24 * 60
  if (diffMins < -12 * 60) diffMins += 24 * 60
  return new Date(naive.getTime() + diffMins * 60_000).toISOString()
}
