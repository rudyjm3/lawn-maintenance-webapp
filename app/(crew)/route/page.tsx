"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin, Clock, Navigation, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { todayUtc } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"
import { STOP_STATUS_BADGE, type StopStatus } from "@/components/crew/stop-status"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────


function formatDuration(minutes: number): string {
  if (!minutes) return "0m"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(isoDatetime: string | null): string {
  if (!isoDatetime) return "—"
  return new Date(isoDatetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

// ─── Stop card (with collapsible access notes) ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StopCard({ stop }: { stop: any }) {
  const [expanded, setExpanded] = useState(false)

  const job      = stop.job
  const client   = job?.client
  const property = job?.property
  const svc      = job?.property_service?.service_type
  const isDone   = stop.status === "completed" || stop.status === "skipped"
  const statusInfo = STOP_STATUS_BADGE[stop.status as StopStatus] ?? STOP_STATUS_BADGE.pending
  const hasAccessInfo = property?.access_notes || property?.gate_code || property?.pet_notes
  const mapsUrl = property?.address
    ? `https://maps.google.com/?q=${encodeURIComponent(property.address)}`
    : "#"

  return (
    <div className={`border-b border-border px-4 py-4 ${isDone ? "opacity-60" : ""}`}>
      {/* Main row */}
      <div className="flex items-start gap-3">
        {/* Stop number */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
          {stop.stop_order}
        </div>

        <div className="min-w-0 flex-1">
          {/* Client + status */}
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-foreground">
              {client?.name ?? "Unknown Client"}
            </span>
            <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
              {statusInfo.label}
            </Badge>
          </div>

          {/* Address */}
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {property?.address ?? "No address"}
          </p>

          {/* Service + time row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{svc?.name ?? "Service"}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(job?.estimated_duration_min ?? 0)}
            </span>
            {stop.travel_time_min > 0 && (
              <span className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {formatDuration(stop.travel_time_min)} drive
              </span>
            )}
            {stop.est_arrival && (
              <span>ETA {formatTime(stop.est_arrival)}</span>
            )}
          </div>
        </div>

        {/* Expand toggle + nav */}
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
            aria-label="Open in Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          {hasAccessInfo && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
              aria-label={expanded ? "Collapse" : "Show access info"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible access info */}
      {expanded && hasAccessInfo && (
        <div className="mt-3 ml-12 rounded-md bg-muted/60 px-3 py-3 text-sm space-y-1.5">
          {property?.access_notes && (
            <p><span className="font-medium text-foreground">Access: </span>{property.access_notes}</p>
          )}
          {property?.gate_code && (
            <p><span className="font-medium text-foreground">Gate code: </span>{property.gate_code}</p>
          )}
          {property?.pet_notes && (
            <p><span className="font-medium text-foreground">Pets: </span>{property.pet_notes}</p>
          )}
        </div>
      )}

      {/* Start Job link for pending/arrived stops */}
      {!isDone && (
        <div className="mt-3 ml-12">
          <Link
            href={`/crew/job/${job?.id}?stopId=${stop.id}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View Job
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoutePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [route, setRoute] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Not signed in."); setLoading(false); return }

      const { data: userData, error: userDataError } = await db
        .from("users")
        .select("id, business_id, crew_members(crew_id)")
        .eq("auth_user_id", user.id)
        .single()
      if (userDataError || !userData) {
        setError(userDataError?.message ?? "Could not load your crew assignment.")
        setLoading(false)
        return
      }

      const crewIds: string[] = (userData?.crew_members ?? []).map(
        (cm: { crew_id: string }) => cm.crew_id,
      )

      if (!crewIds.length) { setError("Not assigned to a crew."); setLoading(false); return }

      const today = todayUtc()
      const { data: routeRows, error: routeError } = await db
        .from("routes")
        .select(`
          id, route_date, total_job_min, total_drive_min, is_locked,
          crew:crews(id, name),
          route_stops(
            id, stop_order, travel_time_min, est_arrival, est_finish,
            actual_arrival, actual_finish, status, job_id,
            job:jobs(
              id, estimated_duration_min, photo_required, status,
              client:clients(id, name),
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

      if (routeError) { setError(routeError.message); setLoading(false); return }
      setRoute((routeRows ?? [])[0] ?? null)
      setLoading(false)
    }

    load()
  }, [reloadKey])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !route) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-base font-medium">{error ?? "No route for today."}</p>
        <Button variant="outline" onClick={() => setReloadKey((v) => v + 1)}>
          Retry
        </Button>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stops: any[] = [...(route.route_stops ?? [])].sort(
    (a, b) => a.stop_order - b.stop_order,
  )
  const completedCount = stops.filter((s) => s.status === "completed").length
  const totalCount     = stops.length

  // Estimate finish from last stop
  const lastStop   = stops[stops.length - 1]
  const finishTime = lastStop?.est_finish ? formatTime(lastStop.est_finish) : "—"

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{route.crew?.name ?? "Route"}</h1>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} stops complete
            </p>
          </div>
          {route.is_locked && (
            <Badge variant="outline" className="text-xs">Locked</Badge>
          )}
        </div>
      </div>

      {/* Stop list */}
      {stops.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No stops on this route.
        </div>
      ) : (
        <div>
          {stops.map((stop) => (
            <StopCard key={stop.id} stop={stop} />
          ))}
        </div>
      )}

      {/* Bottom summary bar */}
      <div className="border-t border-border bg-muted/40 px-4 py-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{totalCount} stops</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(route.total_job_min ?? 0)} job time
          </span>
          <span className="flex items-center gap-1">
            <Navigation className="h-3.5 w-3.5" />
            {formatDuration(route.total_drive_min ?? 0)} drive
          </span>
          <span>Est. finish {finishTime}</span>
        </div>
      </div>
    </div>
  )
}
