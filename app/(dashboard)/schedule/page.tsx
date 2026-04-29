import { WeekPlanner } from "@/components/planner/week-planner"
import { formatUtcDate, startOfWeekUtc } from "@/lib/dates"
import { buildWeekSnapshot, normalizeJobRows } from "@/lib/jobs"
import { createClient } from "@/lib/supabase/server"
import { fetchWeekForecast, type DayWeather } from "@/lib/weather"
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

  const [scheduledJobsResult, unscheduledJobsResult, propertiesResult] = await Promise.all([
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
    db
      .from("properties")
      .select("lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(50),
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

  // Compute centroid of geocoded properties for weather lookup
  const geoProps = (propertiesResult.data ?? []) as { lat: number; lng: number }[]
  let weatherByDate: Record<string, DayWeather> = {}
  if (geoProps.length > 0) {
    const lat = geoProps.reduce((s, p) => s + p.lat, 0) / geoProps.length
    const lng = geoProps.reduce((s, p) => s + p.lng, 0) / geoProps.length
    const forecast = await fetchWeekForecast(lat, lng)
    weatherByDate = Object.fromEntries(forecast.map((d) => [d.date, d]))
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
        <WeekPlanner
          initialDays={weekDays}
          initialUnscheduled={unscheduled}
          weatherByDate={weatherByDate}
        />
      </div>
    </div>
  )
}
