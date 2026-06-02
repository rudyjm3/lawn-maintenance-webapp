import Link from "next/link"
import { ArrowLeft, Clock, TrendingUp, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatDuration } from "@/lib/dates"

export const metadata = { title: "Time Analysis" }

function nMonthsAgo(n: number): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1), 1))
  return d.toISOString().slice(0, 10)
}

function monthLabel(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

type RawJob = {
  id: string
  title: string | null
  service_date: string | null
  estimated_duration_min: number
  actual_duration_min: number
  client: { name: string } | { name: string }[] | null
  property_service: { service_type: { name: string } | { name: string }[] | null } | { service_type: { name: string } | { name: string }[] | null }[] | null
}

type TimeJob = {
  id: string
  title: string | null
  service_date: string
  estimated_duration_min: number
  actual_duration_min: number
  clientName: string
  serviceTypeName: string
  crewName: string
  variance: number
  variancePct: number
}

type GroupStat = {
  name: string
  count: number
  avgEst: number
  avgActual: number
  avgVariance: number
  avgVariancePct: number
}

function norm<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null
  return val
}

function computeGroups(jobs: TimeJob[], keyFn: (j: TimeJob) => string): GroupStat[] {
  const map = new Map<string, { est: number; actual: number; count: number }>()
  for (const j of jobs) {
    const key = keyFn(j)
    const prev = map.get(key) ?? { est: 0, actual: 0, count: 0 }
    map.set(key, { est: prev.est + j.estimated_duration_min, actual: prev.actual + j.actual_duration_min, count: prev.count + 1 })
  }
  return [...map.entries()]
    .map(([name, { est, actual, count }]) => {
      const avgEst = est / count
      const avgActual = actual / count
      const avgVariance = avgActual - avgEst
      const avgVariancePct = avgEst > 0 ? Math.round((avgVariance / avgEst) * 100) : 0
      return { name, count, avgEst, avgActual, avgVariance, avgVariancePct }
    })
    .sort((a, b) => b.count - a.count)
}

function varianceColor(min: number): string {
  if (min > 10) return "text-orange-600"
  if (min < -10) return "text-emerald-600"
  return "text-muted-foreground"
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function BreakdownTable({ stats, emptyText }: { stats: GroupStat[]; emptyText: string }) {
  if (stats.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Jobs</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Avg Est.</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Avg Actual</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Variance</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.name} className="border-t border-border hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{s.count}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatDuration(Math.round(s.avgEst))}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatDuration(Math.round(s.avgActual))}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-medium ${varianceColor(s.avgVariance)}`}>
                {s.avgVariance > 0 ? "+" : ""}{Math.round(s.avgVariance)}m ({s.avgVariancePct > 0 ? "+" : ""}{s.avgVariancePct}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function TimeAnalysisPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const start = nMonthsAgo(3)
  const end = new Date().toISOString().slice(0, 10)

  const [jobsResult, stopsResult] = await Promise.all([
    db
      .from("jobs")
      .select(`
        id, title, service_date, estimated_duration_min, actual_duration_min,
        client:clients(name),
        property_service:property_services(service_type:service_types(name))
      `)
      .eq("status", "completed")
      .not("estimated_duration_min", "is", null)
      .not("actual_duration_min", "is", null)
      .gte("service_date", start)
      .lte("service_date", end)
      .order("service_date", { ascending: false }),
    db
      .from("route_stops")
      .select("job_id, route:routes(crew:crews(name))")
      .gte("created_at", start + "T00:00:00Z"),
  ])

  const rawJobs = (jobsResult.data ?? []) as RawJob[]

  type StopRow = { job_id: string; route: { crew: { name: string } | null } | { crew: { name: string } | null }[] | null }
  const crewByJobId = new Map<string, string>()
  for (const stop of (stopsResult.data ?? []) as StopRow[]) {
    const route = norm(stop.route)
    const crew = norm(route?.crew ?? null) as { name: string } | null
    if (crew?.name) crewByJobId.set(stop.job_id, crew.name)
  }

  const jobs: TimeJob[] = rawJobs.map((j) => {
    const client = norm(j.client) as { name: string } | null
    const propSvc = norm(j.property_service) as { service_type: { name: string } | { name: string }[] | null } | null
    const svcType = norm(propSvc?.service_type ?? null) as { name: string } | null
    const estimated = j.estimated_duration_min
    const actual = j.actual_duration_min
    const variance = actual - estimated
    return {
      id: j.id,
      title: j.title,
      service_date: j.service_date ?? "",
      estimated_duration_min: estimated,
      actual_duration_min: actual,
      clientName: client?.name ?? "Unknown",
      serviceTypeName: svcType?.name ?? "Unknown",
      crewName: crewByJobId.get(j.id) ?? "Unassigned",
      variance,
      variancePct: estimated > 0 ? Math.round((variance / estimated) * 100) : 0,
    }
  })

  const serviceTypeStats = computeGroups(jobs, (j) => j.serviceTypeName)
  const crewStats = computeGroups(jobs, (j) => j.crewName)

  // Monthly trend (last 3 months)
  const monthStats: { label: string; avgEst: number; avgActual: number; avgVariance: number; count: number }[] = []
  for (let i = 2; i >= 0; i--) {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0))
    const ms = monthStart.toISOString().slice(0, 10)
    const me = monthEnd.toISOString().slice(0, 10)
    const monthJobs = jobs.filter((j) => j.service_date >= ms && j.service_date <= me)
    if (monthJobs.length === 0) {
      monthStats.push({ label: monthLabel(ms), avgEst: 0, avgActual: 0, avgVariance: 0, count: 0 })
    } else {
      const avgEst = monthJobs.reduce((s, j) => s + j.estimated_duration_min, 0) / monthJobs.length
      const avgActual = monthJobs.reduce((s, j) => s + j.actual_duration_min, 0) / monthJobs.length
      monthStats.push({ label: monthLabel(ms), avgEst, avgActual, avgVariance: avgActual - avgEst, count: monthJobs.length })
    }
  }

  const outliers = [...jobs]
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 10)

  const maxBarVal = Math.max(...monthStats.map((m) => Math.max(m.avgEst, m.avgActual)), 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/reports"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Time Analysis</h1>
        <p className="text-sm text-muted-foreground">Last 3 months · {jobs.length} completed jobs with duration data</p>
      </div>

      {/* Monthly trend */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <SectionHeader title="3-Month Trend" sub="Avg estimated vs actual time per month" />
        {jobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="flex gap-6">
            {monthStats.map((m) => (
              <div key={m.label} className="flex-1 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                {m.count === 0 ? (
                  <p className="text-xs text-muted-foreground">No data</p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sky-600">Estimated</span>
                        <span className="tabular-nums">{formatDuration(Math.round(m.avgEst))}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${(m.avgEst / maxBarVal) * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-600">Actual</span>
                        <span className="tabular-nums">{formatDuration(Math.round(m.avgActual))}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(m.avgActual / maxBarVal) * 100}%` }} />
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${varianceColor(m.avgVariance)}`}>
                      <TrendingUp className="inline h-3 w-3 mr-0.5" />
                      {m.avgVariance > 0 ? "+" : ""}{Math.round(m.avgVariance)}m avg variance
                    </div>
                    <p className="text-xs text-muted-foreground">{m.count} jobs</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By service type */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <SectionHeader title="By Service Type" />
        </div>
        <BreakdownTable stats={serviceTypeStats} emptyText="No service type data available." />
      </div>

      {/* By crew */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <SectionHeader title="By Crew" />
        </div>
        <BreakdownTable stats={crewStats} emptyText="No crew assignment data available." />
      </div>

      {/* Top outliers */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <SectionHeader title="Top Outlier Jobs" sub="Largest variance between estimated and actual (last 3 months)" />
        </div>
        {outliers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No outlier data available.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Job</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Client</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Service</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Est.</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actual</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Variance</th>
                </tr>
              </thead>
              <tbody>
                {outliers.map((j) => (
                  <tr key={j.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 text-foreground">
                      <div>{j.title ?? j.serviceTypeName}</div>
                      <div className="text-xs text-muted-foreground">{j.service_date}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{j.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{j.serviceTypeName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatDuration(j.estimated_duration_min)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatDuration(j.actual_duration_min)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${varianceColor(j.variance)}`}>
                      {j.variance > 0 ? "+" : ""}{j.variance}m ({j.variancePct > 0 ? "+" : ""}{j.variancePct}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
