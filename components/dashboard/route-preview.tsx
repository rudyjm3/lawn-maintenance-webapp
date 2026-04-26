import { cn } from "@/lib/utils"
import { MapPin, CheckCircle2, Clock, Circle } from "lucide-react"
import type { Route, RouteStop, Job } from "@/types"

interface RoutePreviewProps {
  route: (Route & { stops: (RouteStop & { job: Job })[] }) | null
}

export function RoutePreview({ route }: RoutePreviewProps) {
  if (!route) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-sm font-semibold text-foreground">Today&apos;s Route</h3>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Not built
          </span>
        </div>
        <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
          <MapPin className="mb-2 h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">No route for today</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Routes will appear here after jobs are scheduled and assigned.
          </p>
        </div>
      </div>
    )
  }

  const preview = route.stops.slice(0, 5)
  const totalH = Math.floor(route.total_job_min / 60)
  const totalM = route.total_job_min % 60
  const driveM = route.total_drive_min

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">Today&apos;s Route</h3>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {route.crew?.name}
        </span>
      </div>

      {/* Summary bar */}
      <div className="mb-4 flex gap-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{route.stops.length}</strong> stops</span>
        <span><strong className="text-foreground">{totalH}h {totalM}m</strong> job time</span>
        <span><strong className="text-foreground">{driveM}m</strong> drive</span>
      </div>

      {/* Stop list */}
      <ol className="space-y-2.5">
        {preview.map((stop) => {
          const isDone = stop.status === "completed"
          const isActive = stop.status === "in_progress"
          return (
            <li key={stop.id} className="flex items-start gap-3">
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : isActive ? (
                  <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    isDone ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {stop.job?.client?.name}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {stop.job?.property?.address?.split(",")[0]}
                </p>
              </div>

              {/* ETA */}
              {stop.est_arrival && !isDone && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(stop.est_arrival).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {route.stops.length > 5 && (
        <p className="mt-3 text-xs text-muted-foreground">
          +{route.stops.length - 5} more stop{route.stops.length - 5 > 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
