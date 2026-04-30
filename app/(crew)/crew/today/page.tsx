import Link from "next/link"
import { MapPin, Clock, Navigation, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { todayUtc, formatDuration } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { STOP_STATUS_BADGE, type StopStatus } from "@/components/crew/stop-status"
import { CrewRoutePicker } from "@/components/crew/crew-route-picker"

export const dynamic = "force-dynamic"
export const metadata = { title: "Today's Route" }

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-base font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">Check back later or contact your manager.</p>
      <Button variant="outline" asChild>
        <Link href="/crew/today">Retry</Link>
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ routeId?: string }>
}) {
  const { routeId: selectedRouteId } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <EmptyState message="Not signed in." />

  const { data: userData, error: userDataError } = await db
    .from("users")
    .select("id, first_name, last_name, business_id, crew_members(crew_id)")
    .eq("auth_user_id", user.id)
    .single()
  if (userDataError) {
    return <EmptyState message={userDataError.message} />
  }

  const crewIds: string[] = (userData?.crew_members ?? []).map((cm: { crew_id: string }) => cm.crew_id)

  if (!crewIds.length) {
    return <EmptyState message="You are not assigned to a crew." />
  }

  const today = todayUtc()

  const { data: routeRows, error: routeRowsError } = await db
    .from("routes")
    .select(`
      id, route_date, total_job_min, total_drive_min, is_locked,
      crew:crews(id, name),
      route_stops(
        id, stop_order, travel_time_min, est_arrival, est_finish,
        actual_arrival, actual_finish, status, job_id,
        job:jobs(
          id, estimated_duration_min, photo_required, status,
          client:clients(id, name, phone),
          property:properties(id, address, access_notes, gate_code, pet_notes),
          property_service:property_services(
            id, instructions,
            service_type:service_types(id, name)
          )
        )
      )
    `)
    .in("crew_id", crewIds)
    .eq("route_date", today)
    .order("created_at")
  if (routeRowsError) {
    return <EmptyState message={routeRowsError.message} />
  }

  const allRoutes = routeRows ?? []

  // If the user is on multiple crews with routes today, show a picker
  if (allRoutes.length > 1 && !selectedRouteId) {
    return (
      <CrewRoutePicker
        routes={allRoutes.map((r: { id: string; crew: { name: string } | null; total_job_min: number; total_drive_min: number; route_stops: unknown[] }) => ({
          id: r.id,
          crew: r.crew,
          total_job_min: r.total_job_min,
          total_drive_min: r.total_drive_min,
          stopCount: r.route_stops?.length ?? 0,
        }))}
        href="/crew/today"
      />
    )
  }

  const route = selectedRouteId
    ? (allRoutes.find((r: { id: string }) => r.id === selectedRouteId) ?? allRoutes[0] ?? null)
    : (allRoutes[0] ?? null)

  if (!route) {
    return <EmptyState message="No route scheduled for today." />
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stops: any[] = [...(route.route_stops ?? [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  )

  const completedCount = stops.filter((s) => s.status === "completed").length
  const skippedCount   = stops.filter((s) => s.status === "skipped").length
  const totalCount     = stops.length
  const progressPct    = totalCount > 0 ? Math.round(((completedCount + skippedCount) / totalCount) * 100) : 0

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4">
        <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{route.crew?.name ?? "My Route"}</h1>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} jobs done
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{progressPct}%</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Stats row */}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(route.total_job_min ?? 0)} job time
          </span>
          {(route.total_drive_min ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              {formatDuration(route.total_drive_min)} drive time
            </span>
          )}
        </div>
      </div>

      {/* ── Stop list ── */}
      <div className="divide-y divide-border">
        {stops.map((stop) => {
          const job      = stop.job
          const client   = job?.client
          const property = job?.property
          const svc      = job?.property_service?.service_type

          const statusInfo = STOP_STATUS_BADGE[stop.status as StopStatus] ?? STOP_STATUS_BADGE.pending
          const isDone     = stop.status === "completed" || stop.status === "skipped"
          const mapsUrl    = property?.address
            ? `https://maps.google.com/?q=${encodeURIComponent(property.address)}`
            : "#"

          return (
            <div
              key={stop.id}
              className={`flex flex-col gap-3 px-4 py-4 ${isDone ? "opacity-60" : ""}`}
            >
              {/* Top row: stop number + client + status */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {stop.stop_order}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold text-foreground">
                      {client?.name ?? "Unknown Client"}
                    </p>
                    <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {property?.address ?? "No address"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {svc?.name ?? "Service"} - {formatDuration(job?.estimated_duration_min ?? 0)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              {!isDone && (
                <div className="flex gap-2 pl-11">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Navigation className="h-4 w-4" />
                    Navigate
                  </a>
                  <Button asChild className="h-11 flex-1">
                    <Link
                      href={`/crew/job/${job?.id}?stopId=${stop.id}`}
                      className="flex items-center gap-1.5"
                    >
                      Start Job
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}

              {/* Completed: show completion time */}
              {stop.status === "completed" && stop.actual_finish && (
                <p className="pl-11 text-xs text-muted-foreground">
                  Completed at {new Date(stop.actual_finish).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              )}
              {stop.status === "skipped" && (
                <p className="pl-11 text-xs text-muted-foreground">Skipped</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── All done state ── */}
      {totalCount > 0 && completedCount + skippedCount === totalCount && (
        <div className="px-4 py-8 text-center">
          <p className="text-base font-semibold text-foreground">All jobs complete!</p>
          <p className="mt-1 text-sm text-muted-foreground">Great work today.</p>
        </div>
      )}
    </div>
  )
}

