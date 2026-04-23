import Link from "next/link"
import {
  ClipboardList,
  Clock,
  Gauge,
  Megaphone,
  AlertTriangle,
  CalendarX2,
  Receipt,
  Map,
  Users,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { WeekSnapshot } from "@/components/dashboard/week-snapshot"
import { RoutePreview } from "@/components/dashboard/route-preview"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { Button } from "@/components/ui/button"
import {
  getMockDashboardKPIs,
  getMockWeekSnapshot,
  getMockActivity,
  getMockTodayRoute,
  mockOverdueInvoices,
  mockLeads,
  mockJobs,
} from "@/lib/mock-data"

export const metadata = { title: "Dashboard" }

export default function DashboardPage() {
  // TODO: Replace with real Supabase queries once schema is applied
  const kpis = getMockDashboardKPIs()
  const week = getMockWeekSnapshot()
  const activity = getMockActivity()
  const todayRoute = getMockTodayRoute()

  const overbookedDays = week.filter((d) => d.isOverbooked)
  const unassignedCount = mockJobs.filter((j) => j.status === "unscheduled").length
  const overdueCount = mockOverdueInvoices.length
  const newLeadsCount = mockLeads.filter((l) => l.status === "new").length

  const capacityPct = Math.min(
    100,
    Math.round(((kpis.hoursBookedToday * 60) / kpis.capacityMinutesToday) * 100),
  )

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── Row 1: KPI cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Today's Jobs"
          value={kpis.todaysJobsCount}
          sub={`${kpis.todaysJobsCompleted} completed`}
          icon={ClipboardList}
        />
        <KpiCard
          title="Hours Booked"
          value={`${kpis.hoursBookedToday}h`}
          sub={`${capacityPct}% of daily capacity`}
          icon={Clock}
        />
        <KpiCard
          title="Capacity Left"
          value={`${Math.max(0, Math.round(((kpis.capacityMinutesToday - kpis.hoursBookedToday * 60) / 60) * 10) / 10)}h`}
          sub={`of ${kpis.capacityMinutesToday / 60}h total`}
          icon={Gauge}
        />
        <KpiCard
          title="Open Leads"
          value={kpis.openLeadsCount}
          sub={`${newLeadsCount} new today`}
          icon={Megaphone}
        />
      </div>

      {/* ── Row 2: Alert strip ── */}
      {(overbookedDays.length > 0 || unassignedCount > 0 || overdueCount > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {overbookedDays.length > 0 && (
            <AlertCard
              icon={AlertTriangle}
              colorClass="text-destructive bg-destructive/10"
              label={`${overbookedDays.length} overbooked day${overbookedDays.length > 1 ? "s" : ""} this week`}
              action={{ label: "Fix in Planner", href: "/schedule" }}
            />
          )}
          {unassignedCount > 0 && (
            <AlertCard
              icon={CalendarX2}
              colorClass="text-amber-600 bg-amber-50 dark:bg-amber-950/40"
              label={`${unassignedCount} job${unassignedCount > 1 ? "s" : ""} need a date`}
              action={{ label: "Open Schedule", href: "/schedule" }}
            />
          )}
          {overdueCount > 0 && (
            <AlertCard
              icon={Receipt}
              colorClass="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
              label={`${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`}
              action={{ label: "View Invoices", href: "/invoices" }}
            />
          )}
        </div>
      )}

      {/* ── Row 3: Route preview + Week snapshot ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RoutePreview route={todayRoute} />
        </div>
        <div className="lg:col-span-2">
          <WeekSnapshot days={week} />
        </div>
      </div>

      {/* ── Row 4: Activity + Quick actions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ActivityFeed items={activity} />
        </div>
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

// ─── Inline sub-components ────────────────────────────────────────────────────

function AlertCard({
  icon: Icon,
  colorClass,
  label,
  action,
}: {
  icon: typeof AlertTriangle
  colorClass: string
  label: string
  action: { label: string; href: string }
}) {
  return (
    <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <Link href={action.href} className="shrink-0 text-xs font-medium text-primary hover:underline">
        {action.label} →
      </Link>
    </div>
  )
}

function QuickActions() {
  const actions = [
    { label: "Add Client", href: "/clients?new=1", icon: Users },
    { label: "Create Job", href: "/jobs?new=1", icon: ClipboardList },
    { label: "Build Route", href: "/routes", icon: Map },
    { label: "Send Invoice", href: "/invoices?new=1", icon: Receipt },
  ]
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button variant="outline" className="h-auto w-full flex-col gap-1.5 py-4">
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
