import Link from "next/link"
import { MapPin, Navigation } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatDuration } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"
import { NewRouteDialog } from "@/components/routes/new-route-dialog"

export const dynamic = "force-dynamic"
export const metadata = { title: "Route Planner" }

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export default async function RoutesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const today = new Date()
  const rangeStart = new Date(today)
  const rangeEnd = new Date(today)
  rangeStart.setDate(today.getDate() - 7)
  rangeEnd.setDate(today.getDate() + 14)

  const startIso = rangeStart.toISOString().slice(0, 10)
  const endIso = rangeEnd.toISOString().slice(0, 10)

  const [routesResult, crewsResult] = await Promise.all([
    db
      .from("routes")
      .select("id, route_date, total_job_min, total_drive_min, is_locked, crew:crews(id, name)")
      .gte("route_date", startIso)
      .lte("route_date", endIso)
      .order("route_date", { ascending: true }),
    db
      .from("crews")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  const { data, error } = routesResult
  const crews = (crewsResult.data ?? []) as { id: string; name: string }[]

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    )
  }

  const routes = data ?? []

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Route Planner</h1>
          <p className="text-sm text-muted-foreground">
            Routes for the current planning window.
          </p>
        </div>
        <NewRouteDialog crews={crews} />
      </div>

      {routes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No routes found.</p>
          <p className="text-sm text-muted-foreground">
            Create route records and assignments to populate this planner view.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Crew</th>
                <th className="px-4 py-2 font-medium">Job Time</th>
                <th className="px-4 py-2 font-medium">Drive Time</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route: { id: string; route_date: string; total_job_min: number; total_drive_min: number; is_locked: boolean; crew: { name: string } | null }) => (
                <tr key={route.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/routes/${route.id}`} className="font-medium hover:underline">
                      {formatDate(route.route_date)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{route.crew?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{route.total_job_min > 0 ? formatDuration(route.total_job_min) : "—"}</td>
                  <td className="px-4 py-3">{route.total_drive_min > 0 ? formatDuration(route.total_drive_min) : "—"}</td>
                  <td className="px-4 py-3">
                    {route.is_locked ? (
                      <Badge variant="outline">Locked</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Navigation className="h-3 w-3" />
                        Open
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Crew mobile route execution is available at <Link href="/crew/route" className="underline">/crew/route</Link>.
      </p>
    </div>
  )
}
