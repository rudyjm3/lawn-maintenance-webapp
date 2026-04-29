import Link from "next/link"
import { MapPin, Clock, Navigation, ChevronRight } from "lucide-react"
import { formatDuration } from "@/lib/dates"

type RouteOption = {
  id: string
  crew: { name: string } | null
  total_job_min: number
  total_drive_min: number
  stopCount: number
}

export function CrewRoutePicker({ routes, href }: { routes: RouteOption[]; href: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center gap-4 px-6 py-8">
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">You&apos;re on multiple crews today.</p>
        <p className="mt-1 text-sm text-muted-foreground">Pick the route you&apos;re running.</p>
      </div>
      <div className="space-y-3">
        {routes.map((route) => (
          <Link
            key={route.id}
            href={`${href}?routeId=${route.id}`}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{route.crew?.name ?? "Unassigned"}</p>
              <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                <span>{route.stopCount} stop{route.stopCount !== 1 ? "s" : ""}</span>
                {route.total_job_min > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(route.total_job_min)}
                  </span>
                )}
                {route.total_drive_min > 0 && (
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {formatDuration(route.total_drive_min)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
