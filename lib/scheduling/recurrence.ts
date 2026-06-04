import type { FrequencyType } from "@/types"

export interface RecurrenceRuleInput {
  frequency_type: FrequencyType
  interval: number
  day_of_week: number | null
  start_date: string
  end_date: string | null
  active_months: number[] | null
}

export function computeOccurrences(
  rule: RecurrenceRuleInput,
  count = 10,
  exceptions: { original_date: string; exception_type: string }[] = [],
  rangeStart?: string,
): Date[] {
  const results: Date[] = []
  const skippedDates = new Set(
    exceptions
      .filter((e) => e.exception_type === "skip" || e.exception_type === "cancel")
      .map((e) => e.original_date)
  )

  const [sy, sm, sd] = rule.start_date.split("-").map(Number)
  let cursor = new Date(Date.UTC(sy, sm - 1, sd))

  if (rule.day_of_week !== null) {
    while (cursor.getUTCDay() !== rule.day_of_week) {
      cursor = addDays(cursor, 1)
    }
  }

  const stepDays =
    rule.frequency_type === "weekly"
      ? 7
      : rule.frequency_type === "biweekly"
        ? 14
        : rule.frequency_type === "custom"
          ? Math.max(1, rule.interval) * 7
          : null // monthly handled separately

  // Fast-forward cursor to just before rangeStart to avoid iterating every
  // past occurrence for long-running rules.
  if (rangeStart) {
    const rangeStartDate = parseUTC(rangeStart)
    if (cursor < rangeStartDate) {
      if (stepDays !== null) {
        const msGap = rangeStartDate.getTime() - cursor.getTime()
        const stepsToSkip = Math.floor(msGap / (stepDays * 86_400_000))
        if (stepsToSkip > 1) {
          cursor = addDays(cursor, (stepsToSkip - 1) * stepDays)
        }
      } else {
        // Monthly: step forward until the next advance would overshoot rangeStart
        while (addOneMonth(cursor, rule.day_of_week) <= rangeStartDate) {
          cursor = addOneMonth(cursor, rule.day_of_week)
        }
      }
    }
  }

  const endDate = rule.end_date ? parseUTC(rule.end_date) : null
  const hardLimit = new Date(Date.UTC(cursor.getUTCFullYear() + 3, 0, 1))

  while (results.length < count && cursor < hardLimit) {
    if (endDate && cursor > endDate) break

    const month = cursor.getUTCMonth() + 1
    const inActiveMonth = !rule.active_months || rule.active_months.includes(month)
    const isoDate = toISODate(cursor)

    if (inActiveMonth && !skippedDates.has(isoDate)) {
      results.push(new Date(cursor))
    }

    if (stepDays !== null) {
      cursor = addDays(cursor, stepDays)
    } else {
      cursor = addOneMonth(cursor, rule.day_of_week)
    }
  }

  return results
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000)
}

function addOneMonth(d: Date, targetDow: number | null): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()

  // Try same day-of-month in next calendar month
  let next = new Date(Date.UTC(y, m + 1, day))

  // Clamp overflow: e.g. Jan 31 + 1 month must not become Mar 3
  if (next.getUTCMonth() !== (m + 1) % 12) {
    next = new Date(Date.UTC(y, m + 2, 0)) // last day of intended month
  }

  // For monthly + day_of_week, advance to the first matching weekday >= next
  if (targetDow !== null) {
    while (next.getUTCDay() !== targetDow) {
      next = addDays(next, 1)
    }
  }

  return next
}

function parseUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
