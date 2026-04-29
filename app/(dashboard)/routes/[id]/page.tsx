import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Users, Clock, Navigation } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatDuration } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"
import { RouteStopList } from "@/components/routes/route-stop-list"
import { RouteMap } from "@/components/routes/route-map"
import { RouteLockToggle } from "@/components/routes/route-lock-toggle"
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
          service_type:service_types(id, name)
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !route) notFound()

  const typedRoute = route as Route
  const stops = ((typedRoute.stops ?? []) as RouteStop[]).sort(
    (a, b) => a.stop_order - b.stop_order,
  )

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
              <h1 className="text-xl font-semibold text-foreground">
                {typedRoute.crew?.name ?? "Unassigned Crew"}
              </h1>
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

          <RouteLockToggle routeId={typedRoute.id} isLocked={typedRoute.is_locked} />
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
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Map</h2>
          <RouteMap stops={mapStops} className="h-[480px]" />
        </div>
      </div>
    </div>
  )
}
