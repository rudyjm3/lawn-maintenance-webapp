import { WeekPlanner } from "@/components/planner/week-planner"
import { formatUtcDate, startOfWeekUtc } from "@/lib/dates"
import { buildWeekSnapshot, normalizeJobRows } from "@/lib/jobs"
import { createClient } from "@/lib/supabase/server"
import type { Job } from "@/types"

export const dynamic = "force-dynamic"
export const metadata = { title: "Schedule" }

export default async function SchedulePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const weekStart = startOfWeekUtc(new Date())
  const rangeStart = new Date(weekStart)
  const rangeEnd = new Date(weekStart)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 7)
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 35)

  const [scheduledJobsResult, unscheduledJobsResult] = await Promise.all([
    db
      .from("jobs")
      .select("*, client:clients(*), property:properties(*), property_service:property_services(*, service_type:service_types(*))")
      .gte("service_date", formatUtcDate(rangeStart))
      .lte("service_date", formatUtcDate(rangeEnd))
      .eq("status", "scheduled"),
    db
      .from("jobs")
      .select("*, client:clients(*), property:properties(*), property_service:property_services(*, service_type:service_types(*))")
      .eq("status", "unscheduled"),
  ])

  if (scheduledJobsResult.error || unscheduledJobsResult.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-10 text-center">
        <h1 className="text-xl font-semibold text-foreground">Schedule</h1>
        <p className="text-sm text-destructive">
          {scheduledJobsResult.error?.message ?? unscheduledJobsResult.error?.message ?? "Failed to load schedule."}
        </p>
      </div>
    )
  }

  const scheduledJobs = normalizeJobRows((scheduledJobsResult.data ?? []) as Record<string, unknown>[]) as Job[]
  const unscheduled = normalizeJobRows((unscheduledJobsResult.data ?? []) as Record<string, unknown>[]) as Job[]
  const weekDays = buildWeekSnapshot(scheduledJobs, weekStart)

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Drag jobs between days to reschedule. Red days are over capacity.
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <WeekPlanner initialDays={weekDays} initialUnscheduled={unscheduled} />
      </div>
    </div>
  )
}
