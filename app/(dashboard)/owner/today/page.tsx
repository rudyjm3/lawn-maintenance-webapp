import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarX2,
  CheckCircle2,
  Clock,
  DollarSign,
  Navigation,
  Receipt,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { todayUtc, formatDuration } from "@/lib/dates"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Owner — Today" }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertPill({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: typeof AlertTriangle
  label: string
  href: string
  color: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${color} transition-opacity hover:opacity-80`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
      <ArrowRight className="h-3 w-3 shrink-0" />
    </Link>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StopRow = {
  id: string
  stop_order: number
  status: string
  actual_finish: string | null
  job: {
    id: string
    status: string
    price: number
    estimated_duration_min: number | null
    actual_duration_min: number | null
  } | null
}

type RouteRow = {
  id: string
  crew_id: string
  total_job_min: number
  total_drive_min: number
  crew: { id: string; name: string; color: string | null } | null
  stops: StopRow[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerTodayPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const today = todayUtc()

  const [routesResult, paymentsResult, overdueResult, unscheduledResult] =
    await Promise.all([
      db
        .from("routes")
        .select(`
          id, crew_id, total_job_min, total_drive_min,
          crew:crews(id, name, color),
          stops:route_stops(
            id, stop_order, status, actual_finish,
            job:jobs(id, status, price, estimated_duration_min, actual_duration_min)
          )
        `)
        .eq("route_date", today)
        .order("created_at", { ascending: true }),
      db
        .from("payments")
        .select("amount")
        .eq("payment_date", today),
      db
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("status", "overdue"),
      db
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "unscheduled"),
    ])

  const rawRoutes = (routesResult.data ?? []) as RouteRow[]
  const routes: RouteRow[] = rawRoutes.map((r) => ({
    ...r,
    stops: [...(r.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order),
  }))

  const todayPayments = ((paymentsResult.data ?? []) as { amount: number }[]).reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0,
  )
  const overdueCount = overdueResult.count ?? 0
  const unscheduledCount = unscheduledResult.count ?? 0

  // ── Aggregate job metrics across all routes ───────────────────────────────
  const allStops = routes.flatMap((r) => r.stops)
  const totalStops     = allStops.length
  const completedStops = allStops.filter((s) => s.status === "completed").length
  const inProgressStops = allStops.filter((s) => s.status === "in_progress").length
  const skippedStops   = allStops.filter((s) => s.status === "skipped").length
  const remainingStops = totalStops - completedStops - inProgressStops - skippedStops
  const overallPct     = totalStops > 0 ? Math.round(((completedStops + skippedStops) / totalStops) * 100) : 0

  // ── Revenue for today ─────────────────────────────────────────────────────
  const allJobs = allStops.map((s) => s.job).filter(Boolean) as NonNullable<StopRow["job"]>[]
  const earnedToday    = allJobs
    .filter((j) => j.status === "completed")
    .reduce((s, j) => s + (Number(j.price) || 0), 0)
  const projectedToday = allJobs.reduce((s, j) => s + (Number(j.price) || 0), 0)

  // ── Time remaining estimate ───────────────────────────────────────────────
  const remainingMin = routes.reduce((total, route) => {
    const doneMin = route.stops
      .filter((s) => s.status === "completed" || s.status === "skipped")
      .reduce((s, stop) => s + (stop.job?.actual_duration_min ?? stop.job?.estimated_duration_min ?? 0), 0)
    return total + Math.max(0, (route.total_job_min ?? 0) - doneMin)
  }, 0)

  return (
    <div className="mx-auto max-w-lg space-y-0">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pb-4 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {fmtDate(today)}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Today&apos;s Progress</h1>
            <p className="text-sm text-muted-foreground">
              {routes.length} route{routes.length !== 1 ? "s" : ""} · {totalStops} job{totalStops !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {overallPct}%
          </span>
        </div>

        {/* Master progress bar */}
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {/* Job counts row */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {completedStops} done
          </span>
          {inProgressStops > 0 && (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {inProgressStops} in progress
            </span>
          )}
          <span className="text-muted-foreground">{remainingStops} remaining</span>
          {skippedStops > 0 && (
            <span className="text-orange-500">{skippedStops} skipped</span>
          )}
          {remainingMin > 0 && (
            <span className="ml-auto text-muted-foreground">
              ~{formatDuration(remainingMin)} left
            </span>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {(overdueCount > 0 || unscheduledCount > 0) && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border">
          {overdueCount > 0 && (
            <AlertPill
              icon={Receipt}
              label={`${overdueCount} overdue invoice${overdueCount !== 1 ? "s" : ""}`}
              href="/invoices?status=overdue"
              color="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
            />
          )}
          {unscheduledCount > 0 && (
            <AlertPill
              icon={CalendarX2}
              label={`${unscheduledCount} unscheduled job${unscheduledCount !== 1 ? "s" : ""}`}
              href="/schedule"
              color="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
            />
          )}
        </div>
      )}

      {/* ── Revenue strip ── */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "Earned today", value: fmt$(earnedToday), icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Day projected", value: fmt$(projectedToday), icon: DollarSign, color: "text-foreground" },
          { label: "Collected", value: fmt$(todayPayments), icon: Receipt, color: "text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-2 py-4 text-center">
            <Icon className={`h-4 w-4 ${color}`} />
            <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Route cards ── */}
      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Navigation className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">No routes scheduled today</p>
          <p className="text-sm text-muted-foreground">
            Head to the Route Planner to build today&apos;s routes.
          </p>
          <Link
            href="/routes"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open Route Planner
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {routes.map((route) => {
            const stops = route.stops
            const total     = stops.length
            const completed = stops.filter((s) => s.status === "completed").length
            const inProg    = stops.filter((s) => s.status === "in_progress").length
            const skipped   = stops.filter((s) => s.status === "skipped").length
            const remaining = total - completed - inProg - skipped
            const pct       = total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0
            const crewColor = route.crew?.color ?? "#16a34a"
            const allDone   = remaining === 0 && inProg === 0

            const doneMin = stops
              .filter((s) => s.status === "completed" || s.status === "skipped")
              .reduce((s, stop) => s + (stop.job?.actual_duration_min ?? stop.job?.estimated_duration_min ?? 0), 0)
            const routeRemainingMin = Math.max(0, (route.total_job_min ?? 0) - doneMin)

            return (
              <div key={route.id} className="px-4 py-4 space-y-3">
                {/* Crew name row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: crewColor }}
                    />
                    <span className="truncate text-base font-semibold text-foreground">
                      {route.crew?.name ?? "Unassigned Crew"}
                    </span>
                    {allDone && (
                      <Badge variant="outline" className="shrink-0 text-xs text-emerald-600 border-emerald-300">
                        All done
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: crewColor }}
                  />
                </div>

                {/* Stat chips */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-emerald-600 font-medium">{completed} done</span>
                  {inProg > 0 && <span className="text-blue-600 font-medium">{inProg} in progress</span>}
                  <span className="text-muted-foreground">{remaining} left</span>
                  {skipped > 0 && <span className="text-orange-500">{skipped} skipped</span>}
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {routeRemainingMin > 0 ? `~${formatDuration(routeRemainingMin)} left` : "Complete"}
                  </span>
                </div>

                {/* Crew details footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {total} stop{total !== 1 ? "s" : ""}
                    {(route.total_drive_min ?? 0) > 0 && (
                      <> · {formatDuration(route.total_job_min ?? 0)} job / {formatDuration(route.total_drive_min)} drive</>
                    )}
                  </span>
                  <Link
                    href={`/routes?routeId=${route.id}`}
                    className="flex items-center gap-0.5 text-primary hover:underline"
                  >
                    View route
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bottom spacer for mobile scroll ── */}
      <div className="h-8" />
    </div>
  )
}
