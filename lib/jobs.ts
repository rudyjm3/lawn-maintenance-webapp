import { computeOccurrences } from "@/lib/scheduling/recurrence"
import { addUtcDays, formatLocalDate, formatUtcDate, parseUtcDate } from "@/lib/dates"
import type { Job, RecurrenceRule, ScheduleException, ServiceType, WeekDaySnapshot } from "@/types"

export const PLANNER_CAPACITY_MINUTES = 480

type RecurrenceRuleWithExceptions = RecurrenceRule & {
  schedule_exceptions?: ScheduleException[]
}

type PropertyServiceForGeneration = {
  id: string
  business_id: string
  property_id: string
  custom_price: number | null
  duration_min: number | null
  is_active: boolean
  property?: { id: string; client_id: string } | null
  service_type?: ServiceType | null
  recurrence_rules?: RecurrenceRuleWithExceptions[] | null
}

type GeneratedJobCandidate = {
  business_id: string
  client_id: string
  property_id: string
  property_service_id: string
  service_date: string
  status: "scheduled"
  estimated_duration_min: number
  actual_duration_min: null
  price: number
  photo_required: boolean
}

export function getJobServiceLabel(job: Job): string {
  return job.service_type?.name ?? "One-off job"
}

export function normalizeJobRow(row: Record<string, unknown>): Job {
  const propertyService =
    (row.property_service as { service_type?: ServiceType | null } | null | undefined) ??
    (row.property_services as { service_type?: ServiceType | null } | null | undefined)

  return {
    ...(row as unknown as Job),
    service_type:
      (row.service_type as ServiceType | undefined) ??
      propertyService?.service_type ??
      undefined,
  }
}

export function normalizeJobRows(rows: Record<string, unknown>[]): Job[] {
  return rows.map(normalizeJobRow)
}

export function buildWeekSnapshot(
  jobs: Job[],
  weekStart: Date,
  capacityMinutes = PLANNER_CAPACITY_MINUTES,
): WeekDaySnapshot[] {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const today = formatLocalDate(new Date())

  return Array.from({ length: 7 }, (_, index) => {
    const date = formatUtcDate(addUtcDays(weekStart, index))
    const dayJobs = jobs.filter((job) => job.service_date === date && job.status !== "cancelled")
    const scheduledMinutes = dayJobs.reduce((sum, job) => sum + job.estimated_duration_min, 0)
    const dateObject = parseUtcDate(date)

    return {
      date,
      label: dayLabels[dateObject.getUTCDay()],
      isToday: date === today,
      jobCount: dayJobs.length,
      scheduledMinutes,
      capacityMinutes,
      isOverbooked: scheduledMinutes > capacityMinutes,
      jobs: dayJobs,
    }
  })
}

function buildOccurrenceDates(
  rule: RecurrenceRuleWithExceptions,
  startDate: string,
  endDate: string,
): string[] {
  const exceptions = rule.schedule_exceptions ?? []
  const ruleExceptions = exceptions.map((exception) =>
    exception.exception_type === "reschedule"
      ? { original_date: exception.original_date, exception_type: "skip" }
      : { original_date: exception.original_date, exception_type: exception.exception_type },
  )

  const baseDates = computeOccurrences(
    {
      frequency_type: rule.frequency_type,
      interval: rule.interval,
      day_of_week: rule.day_of_week,
      start_date: rule.start_date,
      end_date: rule.end_date,
      active_months: rule.active_months,
    },
    64,
    ruleExceptions,
  )
    .map((date) => formatUtcDate(date))
    .filter((date) => date >= startDate && date <= endDate)

  const rescheduledDates = exceptions
    .filter((exception) => exception.exception_type === "reschedule" && exception.new_date)
    .map((exception) => exception.new_date as string)
    .filter((date) => date >= startDate && date <= endDate)

  return [...baseDates, ...rescheduledDates]
}

export async function generateJobsForBusinessLookahead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  businessId: string,
  options: { startDate: string; endDate: string },
) {
  const { startDate, endDate } = options

  const { data: propertyServices, error: propertyServicesError } = await supabase
    .from("property_services")
    .select("*, property:properties(id, client_id), service_type:service_types(*), recurrence_rules(*, schedule_exceptions(*))")
    .eq("business_id", businessId)
    .eq("is_active", true)

  if (propertyServicesError) {
    throw new Error(propertyServicesError.message)
  }

  const recurringPropertyServices = ((propertyServices ?? []) as PropertyServiceForGeneration[]).filter(
    (propertyService) =>
      !!propertyService.property &&
      !!propertyService.service_type &&
      propertyService.service_type.is_recurring &&
      (propertyService.recurrence_rules?.length ?? 0) > 0,
  )

  if (recurringPropertyServices.length === 0) {
    return { createdCount: 0, skippedCount: 0 }
  }

  const propertyServiceIds = recurringPropertyServices.map((propertyService) => propertyService.id)
  const { data: existingJobs, error: existingJobsError } = await supabase
    .from("jobs")
    .select("id, property_service_id, service_date, status")
    .eq("business_id", businessId)
    .in("property_service_id", propertyServiceIds)
    .gte("service_date", startDate)
    .lte("service_date", endDate)

  if (existingJobsError) {
    throw new Error(existingJobsError.message)
  }

  const existingRows = (existingJobs ?? []) as Array<{
    id: string
    property_service_id: string | null
    service_date: string | null
    status: string
  }>
  const existingKeys = new Set(
    existingRows
      .filter((job) => !!job.property_service_id && !!job.service_date)
      .map((job) => `${job.property_service_id}:${job.service_date}`),
  )

  const candidates = new Map<string, GeneratedJobCandidate>()
  const validKeys = new Set<string>()

  for (const propertyService of recurringPropertyServices) {
    const property = propertyService.property
    const serviceType = propertyService.service_type
    if (!property || !serviceType) continue

    for (const rule of propertyService.recurrence_rules ?? []) {
      for (const serviceDate of buildOccurrenceDates(rule, startDate, endDate)) {
        const key = `${propertyService.id}:${serviceDate}`
        validKeys.add(key)
        if (candidates.has(key) || existingKeys.has(key)) continue

        candidates.set(key, {
          business_id: businessId,
          client_id: property.client_id,
          property_id: propertyService.property_id,
          property_service_id: propertyService.id,
          service_date: serviceDate,
          status: "scheduled",
          estimated_duration_min:
            propertyService.duration_min ?? serviceType.default_duration_min,
          actual_duration_min: null,
          price: propertyService.custom_price ?? serviceType.default_price,
          photo_required: false,
        })
      }
    }
  }

  const rows = [...candidates.values()]
  const invalidExistingIds = existingRows
    .filter((job) => !!job.property_service_id && !!job.service_date)
    .filter((job) => !validKeys.has(`${job.property_service_id}:${job.service_date}`))
    .filter((job) => job.status === "scheduled")
    .map((job) => job.id)

  if (invalidExistingIds.length > 0) {
    const { error: deleteError } = await supabase.from("jobs").delete().in("id", invalidExistingIds)
    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  if (rows.length === 0) {
    return { createdCount: 0, skippedCount: existingKeys.size }
  }

  const { error: insertError } = await supabase.from("jobs").insert(rows)
  if (insertError) {
    throw new Error(insertError.message)
  }

  return {
    createdCount: rows.length,
    skippedCount: existingKeys.size,
  }
}
