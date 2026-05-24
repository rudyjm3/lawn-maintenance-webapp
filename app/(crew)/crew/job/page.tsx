import Link from "next/link"
import { MapPin, ChevronRight, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { todayUtc, formatDuration } from "@/lib/dates"

export const dynamic = "force-dynamic"
export const metadata = { title: "Jobs" }

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export default async function CrewJobsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <Empty message="Not signed in." />

  const { data: userData } = await db
    .from("users")
    .select("id, business_id, crew_members(crew_id)")
    .eq("auth_user_id", user.id)
    .single()

  const crewIds: string[] = (userData?.crew_members ?? []).map(
    (cm: { crew_id: string }) => cm.crew_id,
  )

  if (!crewIds.length) return <Empty message="You are not assigned to a crew." />

  const today = todayUtc()

  // Fetch upcoming route stops for this crew member (today + next 14 days)
  const rangeEnd = new Date()
  rangeEnd.setDate(rangeEnd.getDate() + 14)
  const endIso = rangeEnd.toISOString().slice(0, 10)

  const { data: stops } = await db
    .from("route_stops")
    .select(`
      id, stop_order, status, est_arrival,
      job:jobs(
        id, estimated_duration_min, status,
        client:clients(id, name),
        property:properties(id, address),
        property_service:property_services(
          service_type:service_types(name)
        )
      ),
      route:routes!inner(id, route_date, crew_id)
    `)
    .in("route.crew_id", crewIds)
    .gte("route.route_date", today)
    .lte("route.route_date", endIso)
    .not("status", "eq", "completed")
    .not("status", "eq", "skipped")
    .order("route.route_date", { ascending: true })
    .order("stop_order", { ascending: true })

  const rows = (stops ?? []) as any[] // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4">
        <h1 className="text-lg font-semibold">Upcoming Jobs</h1>
        <p className="text-sm text-muted-foreground">Next 14 days · {rows.length} job{rows.length !== 1 ? "s" : ""}</p>
      </div>

      {rows.length === 0 ? (
        <Empty message="No upcoming jobs scheduled." />
      ) : (
        <div className="divide-y divide-border">
          {rows.map((stop) => {
            const job = stop.job
            const route = stop.route
            return (
              <Link
                key={stop.id}
                href={`/crew/job/${job?.id}?stopId=${stop.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-primary">
                      {formatDate(route?.route_date ?? today)}
                    </span>
                    <span className="text-xs text-muted-foreground">Stop {stop.stop_order}</span>
                  </div>
                  <p className="font-medium text-foreground truncate">
                    {job?.client?.name ?? "Unknown Client"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {job?.property?.address ?? "No address"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{job?.property_service?.service_type?.name ?? "Service"}</span>
                    {job?.estimated_duration_min > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(job.estimated_duration_min)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">Check back later or contact your manager.</p>
    </div>
  )
}
