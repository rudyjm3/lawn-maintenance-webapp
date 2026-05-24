import {
  CheckCircle2,
  DollarSign,
  ClipboardList,
  Users,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { formatDuration } from "@/lib/dates"

export const metadata = { title: "Reports" }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthRange() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  const label = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  return { start, end, label }
}

function fmt$(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function StatusBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string
  count: number
  total: number
  colorClass: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground capitalize">{label}</span>
        <span className="font-medium tabular-nums">
          {count} <span className="text-muted-foreground font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed:   "bg-emerald-500",
  in_progress: "bg-blue-500",
  scheduled:   "bg-sky-400",
  unscheduled: "bg-amber-400",
  skipped:     "bg-orange-400",
  cancelled:   "bg-red-400",
}

const STATUS_ORDER = ["completed", "in_progress", "scheduled", "unscheduled", "skipped", "cancelled"]

type JobRow = {
  id: string
  status: string
  price: number
  estimated_duration_min: number | null
  actual_duration_min: number | null
}

type RouteRow = {
  id: string
  total_job_min: number
  total_drive_min: number
  crew: { name: string } | null
  stop_count: number
}

type CrewSummary = {
  name: string
  routes: number
  jobMin: number
  driveMin: number
}

export default async function ReportsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { start, end, label } = monthRange()

  const [jobsResult, paymentsResult, routesResult, leadsResult] = await Promise.all([
    db
      .from("jobs")
      .select("id, status, price, estimated_duration_min, actual_duration_min")
      .gte("service_date", start)
      .lte("service_date", end),
    db
      .from("payments")
      .select("amount")
      .gte("payment_date", start)
      .lte("payment_date", end),
    db
      .from("routes")
      .select("id, total_job_min, total_drive_min, crew:crews(name), stops:route_stops(id)")
      .gte("route_date", start)
      .lte("route_date", end),
    db.from("leads").select("id, status"),
  ])

  if (jobsResult.error || paymentsResult.error || routesResult.error) {
    const msg = jobsResult.error?.message ?? paymentsResult.error?.message ?? routesResult.error?.message
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">Failed to load report data: {msg}</p>
      </div>
    )
  }

  const jobs = (jobsResult.data ?? []) as JobRow[]
  const payments = (paymentsResult.data ?? []) as { amount: number }[]
  const allLeads = (leadsResult.data ?? []) as { id: string; status: string }[]
  const rawRoutes = (routesResult.data ?? []) as Array<{
    id: string
    total_job_min: number
    total_drive_min: number
    crew: { name: string } | null
    stops: { id: string }[]
  }>

  // ── Job metrics ──────────────────────────────────────────────────────────────
  const totalJobs = jobs.length
  const completedJobs = jobs.filter((j) => j.status === "completed")
  const revenueEarned = completedJobs.reduce((sum, j) => sum + (Number(j.price) || 0), 0)
  const revenueCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const avgJobValue = completedJobs.length > 0 ? revenueEarned / completedJobs.length : 0

  const avgDuration =
    completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.actual_duration_min ?? j.estimated_duration_min ?? 0), 0) /
        completedJobs.length
      : 0

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] ?? 0) + 1
  }

  // ── Crew output ──────────────────────────────────────────────────────────────
  const routes: RouteRow[] = rawRoutes.map((r) => ({
    id: r.id,
    total_job_min: r.total_job_min ?? 0,
    total_drive_min: r.total_drive_min ?? 0,
    crew: r.crew,
    stop_count: r.stops?.length ?? 0,
  }))

  const crewMap = new Map<string, CrewSummary>()
  for (const route of routes) {
    const name = route.crew?.name ?? "Unassigned"
    const existing = crewMap.get(name) ?? { name, routes: 0, jobMin: 0, driveMin: 0 }
    crewMap.set(name, {
      name,
      routes: existing.routes + 1,
      jobMin: existing.jobMin + route.total_job_min,
      driveMin: existing.driveMin + route.total_drive_min,
    })
  }
  const crewSummaries = [...crewMap.values()].sort((a, b) => b.jobMin - a.jobMin)

  // ── Time accuracy ─────────────────────────────────────────────────────────────
  const jobsWithBothTimes = completedJobs.filter(
    (j) => j.estimated_duration_min != null && j.actual_duration_min != null,
  )
  const avgEstimate =
    jobsWithBothTimes.length > 0
      ? jobsWithBothTimes.reduce((s, j) => s + (j.estimated_duration_min ?? 0), 0) /
        jobsWithBothTimes.length
      : 0
  const avgActual =
    jobsWithBothTimes.length > 0
      ? jobsWithBothTimes.reduce((s, j) => s + (j.actual_duration_min ?? 0), 0) /
        jobsWithBothTimes.length
      : 0
  const avgVarianceMin = avgActual - avgEstimate
  const avgVariancePct =
    avgEstimate > 0 ? Math.round((avgVarianceMin / avgEstimate) * 100) : 0

  // ── Lead funnel ───────────────────────────────────────────────────────────────
  const FUNNEL_STAGES: { key: string; label: string }[] = [
    { key: "new",           label: "New" },
    { key: "contacted",     label: "Contacted" },
    { key: "site_visit",    label: "Site Visit" },
    { key: "estimate_sent", label: "Estimate Sent" },
    { key: "won",           label: "Won" },
  ]
  const leadStatusCounts: Record<string, number> = {}
  for (const l of allLeads) {
    leadStatusCounts[l.status] = (leadStatusCounts[l.status] ?? 0) + 1
  }
  const totalLeads = allLeads.length
  const wonLeads   = leadStatusCounts["won"] ?? 0
  const lostLeads  = leadStatusCounts["lost"] ?? 0
  const winRate    = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Jobs Completed"
          value={completedJobs.length}
          sub={`of ${totalJobs} total this month`}
          icon={CheckCircle2}
        />
        <KpiCard
          title="Revenue Earned"
          value={fmt$(revenueEarned)}
          sub="From completed jobs"
          icon={DollarSign}
        />
        <KpiCard
          title="Revenue Collected"
          value={fmt$(revenueCollected)}
          sub="Payments received"
          icon={DollarSign}
        />
        <KpiCard
          title="Avg Job Value"
          value={fmt$(avgJobValue)}
          sub={avgDuration > 0 ? `~${Math.round(avgDuration)} min avg duration` : "Completed jobs"}
          icon={ClipboardList}
        />
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Jobs by status */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            title="Jobs by Status"
            sub={`${totalJobs} job${totalJobs !== 1 ? "s" : ""} this month`}
          />
          {totalJobs === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No jobs this month.</p>
          ) : (
            <div className="space-y-4">
              {STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0).map((status) => (
                <StatusBar
                  key={status}
                  label={status.replace("_", " ")}
                  count={statusCounts[status] ?? 0}
                  total={totalJobs}
                  colorClass={STATUS_COLORS[status] ?? "bg-muted-foreground"}
                />
              ))}
            </div>
          )}
        </div>

        {/* Crew output */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <SectionHeader
            title="Crew Output"
            sub={`${routes.length} route${routes.length !== 1 ? "s" : ""} run this month`}
          />
          {crewSummaries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No routes this month.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Crew</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Routes</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Job Time</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Drive Time</th>
                  </tr>
                </thead>
                <tbody>
                  {crewSummaries.map((crew) => (
                    <tr key={crew.name} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                          <Users className="h-3.5 w-3.5 text-primary" />
                        </span>
                        {crew.name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{crew.routes}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatDuration(crew.jobMin)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatDuration(crew.driveMin)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="px-4 py-3 font-semibold text-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{routes.length}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatDuration(crewSummaries.reduce((s, c) => s + c.jobMin, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatDuration(crewSummaries.reduce((s, c) => s + c.driveMin, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Actual vs estimated time ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <SectionHeader
          title="Actual vs. Estimated Time"
          sub={`${jobsWithBothTimes.length} completed job${jobsWithBothTimes.length !== 1 ? "s" : ""} with both estimates recorded this month`}
        />
        {jobsWithBothTimes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No completed jobs with both estimated and actual durations this month.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              {
                label: "Avg estimated",
                value: `${Math.round(avgEstimate)} min`,
                sub: "Per completed job",
                icon: Clock,
                color: "text-sky-600",
              },
              {
                label: "Avg actual",
                value: `${Math.round(avgActual)} min`,
                sub: "Per completed job",
                icon: Clock,
                color: "text-blue-600",
              },
              {
                label: "Avg variance",
                value: avgVarianceMin === 0
                  ? "On target"
                  : `${avgVarianceMin > 0 ? "+" : ""}${Math.round(avgVarianceMin)} min`,
                sub: avgEstimate > 0 ? `${avgVariancePct > 0 ? "+" : ""}${avgVariancePct}% vs estimate` : "",
                icon: TrendingUp,
                color: avgVarianceMin > 5 ? "text-orange-600" : avgVarianceMin < -5 ? "text-emerald-600" : "text-muted-foreground",
              },
              {
                label: "Jobs over estimate",
                value: `${jobsWithBothTimes.filter((j) => (j.actual_duration_min ?? 0) > (j.estimated_duration_min ?? 0)).length}`,
                sub: `of ${jobsWithBothTimes.length} tracked`,
                icon: Clock,
                color: "text-amber-600",
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="space-y-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lead conversion funnel ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <SectionHeader
          title="Lead Conversion Funnel"
          sub={`${totalLeads} total lead${totalLeads !== 1 ? "s" : ""} — all time`}
        />
        {totalLeads === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No leads yet. Leads from your quote form will appear here.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
              {FUNNEL_STAGES.map((stage, i) => {
                const count = leadStatusCounts[stage.key] ?? 0
                const barPct = totalLeads > 0 ? Math.max(4, Math.round((count / totalLeads) * 100)) : 4
                const isWon = stage.key === "won"
                return (
                  <div key={stage.key} className="flex flex-1 flex-col items-center gap-1.5">
                    {i > 0 && (
                      <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground/50 self-center mb-0.5" />
                    )}
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{count}</span>
                      <div className="w-full h-8 rounded-md overflow-hidden bg-muted flex items-end">
                        <div
                          className={`w-full rounded-md transition-all ${isWon ? "bg-emerald-500" : "bg-primary/70"}`}
                          style={{ height: `${barPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground text-center leading-tight">{stage.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Win rate</p>
                <p className="text-lg font-semibold text-emerald-600">{winRate}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Won</p>
                <p className="text-lg font-semibold text-foreground">{wonLeads}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Lost</p>
                <p className="text-lg font-semibold text-foreground">{lostLeads}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">In pipeline</p>
                <p className="text-lg font-semibold text-foreground">
                  {totalLeads - wonLeads - lostLeads}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Efficiency row ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <SectionHeader
          title="Completion Rate"
          sub="Completed vs scheduled jobs this month"
        />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            {
              label: "Completion rate",
              value: totalJobs > 0 ? `${Math.round((completedJobs.length / totalJobs) * 100)}%` : "—",
              sub: `${completedJobs.length} of ${totalJobs}`,
              icon: CheckCircle2,
              color: "text-emerald-600",
            },
            {
              label: "Avg duration",
              value: avgDuration > 0 ? `${Math.round(avgDuration)} min` : "—",
              sub: "Per completed job",
              icon: Clock,
              color: "text-blue-600",
            },
            {
              label: "Revenue / job",
              value: fmt$(avgJobValue),
              sub: "Completed jobs",
              icon: DollarSign,
              color: "text-violet-600",
            },
            {
              label: "Collection rate",
              value: revenueEarned > 0 ? `${Math.round((revenueCollected / revenueEarned) * 100)}%` : "—",
              sub: `${fmt$(revenueCollected)} of ${fmt$(revenueEarned)}`,
              icon: DollarSign,
              color: "text-amber-600",
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="space-y-1">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
