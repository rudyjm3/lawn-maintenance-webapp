import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Users, Clock, Navigation } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatDuration } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"
import { RouteStopList } from "@/components/routes/route-stop-list"
import { RouteMap } from "@/components/routes/route-map"
import { RouteLockToggle } from "@/components/routes/route-lock-toggle"
import { RouteRecalculateButton } from "@/components/routes/route-recalculate-button"
import { AddStopsPanel } from "@/components/routes/add-stops-panel"
import { RouteCrewSelect } from "@/components/routes/route-crew-select"
import type { Route, RouteStop } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from("routes")
    .select("route_date, crew:crews(name)")
    .eq("id", id)
    .single()
  if (!data) return { title: "Route" }
  return { title: `Route — ${data.crew?.name ?? "Unassigned"} ${data.route_date}` }
}

export default async function RouteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: route, error } = await db
    .from("routes")
    .select(`
      *,
      crew:crews(*),
      stops:route_stops(
        *,
        job:jobs(
          *,
          client:clients(id, name),
          property:properties(id, address, lat, lng),
          property_service:property_services(service_type:service_types(id, name))
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !route) notFound()

  const typedRoute = route as Route

  // Normalize service_type onto job so RouteStopList can read job.service_type.name
  const stops = ((typedRoute.stops ?? []) as RouteStop[])
    .sort((a, b) => a.stop_order - b.stop_order)
    .map((stop) => {
      if (stop.job && !stop.job.service_type) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stop.job.service_type = (stop.job as any).property_service?.service_type ?? undefined
      }
      return stop
    })

  // Jobs scheduled for this route's date that aren't already stops on this route
  const routedJobIds = new Set(stops.map((s) => s.job_id).filter(Boolean))

  const [unroutedJobsResult, crewsResult] = await Promise.all([
    db
      .from("jobs")
      .select("id, client:clients(id, name), property:properties(id, address), property_service:property_services(service_type:service_types(id, name)), estimated_duration_min")
      .eq("service_date", typedRoute.route_date)
      .neq("status", "cancelled"),
    db
      .from("crews")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  type UnroutedJob = {
    id: string
    estimated_duration_min: number
    client: { id: string; name: string | null } | null
    property: { id: string; address: string | null } | null
    property_service: { service_type: { id: string; name: string } | null } | null
  }
  const unroutedJobs = ((unroutedJobsResult.data ?? []) as UnroutedJob[]).filter(
    (j) => !routedJobIds.has(j.id),
  )
  const crews = (crewsResult.data ?? []) as { id: string; name: string }[]

  const mapStops = stops
    .filter((s) => s.job?.property?.lat != null && s.job?.property?.lng != null)
    .map((s, i) => ({
      lat: s.job!.property!.lat as number,
      lng: s.job!.property!.lng as number,
      label: String(i + 1),
      address: s.job!.property!.address ?? "",
    }))

  return (
    <div className="space-y-6">
      {/* ── Back nav ── */}
      <Link
        href="/routes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Routes
      </Link>

      {/* ── Route header card ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <RouteCrewSelect
                routeId={typedRoute.id}
                currentCrewId={typedRoute.crew_id ?? null}
                crews={crews}
                isLocked={typedRoute.is_locked}
              />
              {typedRoute.is_locked ? (
                <Badge variant="outline">Locked</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Navigation className="h-3 w-3" />
                  Open
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(typedRoute.route_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {stops.length} stop{stops.length !== 1 ? "s" : ""}
              </span>
              {typedRoute.total_job_min > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(typedRoute.total_job_min)} job
                  {typedRoute.total_drive_min > 0 &&
                    ` + ${formatDuration(typedRoute.total_drive_min)} drive`}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <RouteRecalculateButton routeId={typedRoute.id} isLocked={typedRoute.is_locked} />
            <RouteLockToggle routeId={typedRoute.id} isLocked={typedRoute.is_locked} />
          </div>
        </div>
      </div>

      {/* ── Map + stop list ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Stops</h2>
          <RouteStopList
            routeId={typedRoute.id}
            stops={stops}
            isLocked={typedRoute.is_locked}
          />
          {!typedRoute.is_locked && (
            <AddStopsPanel routeId={typedRoute.id} unroutedJobs={unroutedJobs} />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Map</h2>
          <RouteMap stops={mapStops} className="h-[480px]" />
        </div>
      </div>
    </div>
  )
}
