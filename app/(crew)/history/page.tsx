"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { todayUtc } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "completed" | "skipped"

function formatTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── History Card ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoryCard({ stop }: { stop: any }) {
  const [expanded, setExpanded] = useState(false)

  const job      = stop.job
  const client   = job?.client
  const property = job?.property
  const svc      = job?.property_service?.service_type
  const photos: { photo_url: string; photo_type: string }[] = job?.property_photos ?? []

  return (
    <div className="border-b border-border px-4 py-4">
      {/* Main row */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">
              {client?.name ?? "Unknown Client"}
            </p>
            <Badge
              variant={stop.status === "completed" ? "outline" : "destructive"}
              className="shrink-0 text-xs capitalize"
            >
              {stop.status}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {property?.address ?? "No address"}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{svc?.name ?? "Service"}</span>
            {stop.actual_finish && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Done at {formatTime(stop.actual_finish)}
              </span>
            )}
            {job?.actual_duration_min && (
              <span>
                {formatDuration(job.actual_duration_min)} on site
              </span>
            )}
          </div>
        </div>

        {/* First photo thumbnail */}
        {photos.length > 0 && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border">
            <Image
              src={photos[0].photo_url}
              alt="Job photo"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Expand toggle */}
        {(photos.length > 0) && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Expanded: all photos */}
      {expanded && photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
              <Image
                src={photo.photo_url}
                alt={photo.photo_type}
                fill
                className="object-cover"
                unoptimized
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white capitalize">
                {photo.photo_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stops, setStops]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [tab, setTab]       = useState<Tab>("completed")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Not signed in."); setLoading(false); return }

      const { data: userData } = await db
        .from("users")
        .select("id, business_id, crew_members(crew_id)")
        .eq("auth_user_id", user.id)
        .single()

      const crewIds: string[] = (userData?.crew_members ?? []).map(
        (cm: { crew_id: string }) => cm.crew_id,
      )
      if (!crewIds.length) { setLoading(false); return }

      const today = todayUtc()

      // Get today's route
      const { data: route } = await db
        .from("routes")
        .select("id")
        .in("crew_id", crewIds)
        .eq("route_date", today)
        .maybeSingle()

      if (!route) { setLoading(false); return }

      // Get all stops with completed/skipped status
      const { data: stopsData, error: stopsError } = await db
        .from("route_stops")
        .select(`
          id, stop_order, status, actual_arrival, actual_finish, job_id,
          job:jobs(
            id, actual_duration_min, status,
            client:clients(id, name),
            property:properties(id, address),
            property_service:property_services(
              id,
              service_type:service_types(id, name)
            ),
            property_photos(id, photo_url, photo_type)
          )
        `)
        .eq("route_id", route.id)
        .in("status", ["completed", "skipped"])
        .order("actual_finish", { ascending: false })

      if (stopsError) { setError(stopsError.message); setLoading(false); return }
      setStops(stopsData ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const filtered = stops.filter((s) => s.status === tab)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <MapPin className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-4">
        <h1 className="text-lg font-semibold text-foreground">Today's History</h1>
        <p className="text-sm text-muted-foreground">
          {stops.filter((s) => s.status === "completed").length} completed ·{" "}
          {stops.filter((s) => s.status === "skipped").length} skipped
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["completed", "skipped"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} ({stops.filter((s) => s.status === t).length})
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No {tab} jobs yet today.
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((stop) => (
            <HistoryCard key={stop.id} stop={stop} />
          ))}
        </div>
      )}
    </div>
  )
}
