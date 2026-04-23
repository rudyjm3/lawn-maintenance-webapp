import { WeekPlanner } from "@/components/planner/week-planner"
import { getMockWeekSnapshot, mockJobs } from "@/lib/mock-data"

export const metadata = { title: "Schedule" }

export default function SchedulePage() {
  // TODO: Replace with real Supabase queries:
  // const supabase = await createClient()
  // const { data: jobs } = await supabase
  //   .from("jobs")
  //   .select("*, client(*), property(*), service_type(*), crew(*)")
  //   .gte("service_date", weekStart)
  //   .lte("service_date", weekEnd)
  //   .eq("tenant_id", tenantId)

  const weekDays = getMockWeekSnapshot()
  const unscheduled = mockJobs.filter((j) => j.status === "unscheduled")

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Drag jobs between days to reschedule. Red days are over capacity.
        </p>
      </div>

      {/* Planner takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <WeekPlanner initialDays={weekDays} initialUnscheduled={unscheduled} />
      </div>
    </div>
  )
}
