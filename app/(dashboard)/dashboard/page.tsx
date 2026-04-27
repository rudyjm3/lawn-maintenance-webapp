import Link from "next/link"
import {
  AlertTriangle,
  Building2,
  CalendarX2,
  ClipboardList,
  Map,
  PackageCheck,
  Receipt,
  Users,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { WeekSnapshot } from "@/components/dashboard/week-snapshot"
import { RoutePreview } from "@/components/dashboard/route-preview"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { Button } from "@/components/ui/button"
import { formatLocalDate } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import type { ActivityItem, Job, Route, RouteStop, WeekDaySnapshot } from "@/types"

export const metadata = { title: "Dashboard" }

const CAPACITY_MINUTES = 480

type JobRow = Job & {
  client?: { name: string | null } | null
  property?: { address: string | null } | null
}

type TodayRoute = Route & {
  crew?: { name: string | null } | null
  stops: (RouteStop & { job: JobRow })[]
}

type RecentClient = {
  id: string
  name: string
  created_at: string
}

function isoDate(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return formatLocalDate(d)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function buildWeekSnapshot(jobs: JobRow[], weekStart: Date): WeekDaySnapshot[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const today = formatLocalDate(new Date())

  return Array.from({ length: 7 }, (_, index) => {
    const date = isoDate(weekStart, index)
    const dayJobs = jobs.filter((job) => job.service_date === date && job.status !== "cancelled")
    const scheduledMinutes = dayJobs.reduce((sum, job) => sum + job.estimated_duration_min, 0)
    const d = new Date(`${date}T12:00:00`)

    return {
      date,
      label: labels[d.getDay()],
      isToday: date === today,
      jobCount: dayJobs.length,
      scheduledMinutes,
      capacityMinutes: CAPACITY_MINUTES,
      isOverbooked: scheduledMinutes > CAPACITY_MINUTES,
      jobs: dayJobs,
    }
  })
}

function buildActivity(clients: RecentClient[]): ActivityItem[] {
  return clients.slice(0, 6).map((client) => ({
    id: client.id,
    type: "client_added",
    description: `Client added: ${client.name}`,
    timestamp: client.created_at,
  }))
}

export default async function DashboardPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const today = formatLocalDate(new Date())
  const weekStart = getWeekStart(new Date())
  const weekEnd = isoDate(weekStart, 6)

  const [
    clientsCountResult,
    propertiesCountResult,
    servicesCountResult,
    leadsCountResult,
    invoicesCountResult,
    todayJobsResult,
    weekJobsResult,
    unscheduledJobsResult,
    todayRouteResult,
    recentClientsResult,
  ] = await Promise.all([
    db.from("clients").select("id", { count: "exact", head: true }),
    db.from("properties").select("id", { count: "exact", head: true }),
    db.from("service_types").select("id", { count: "exact", head: true }),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", '("won","lost")'),
    db
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "overdue"),
    db
      .from("jobs")
      .select("*, client:clients(name), property:properties(address)")
      .eq("service_date", today)
      .neq("status", "cancelled"),
    db
      .from("jobs")
      .select("*, client:clients(name), property:properties(address)")
      .gte("service_date", isoDate(weekStart, 0))
      .lte("service_date", weekEnd)
      .neq("status", "cancelled"),
    db
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "unscheduled"),
    db
      .from("routes")
      .select(`
        *,
        crew:crews(name),
        stops:route_stops(
          *,
          job:jobs(
            *,
            client:clients(name),
            property:properties(address)
          )
        )
      `)
      .eq("route_date", today)
      .limit(1)
      .maybeSingle(),
    db
      .from("clients")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ])

  const clientsCount = clientsCountResult.count ?? 0
  const propertiesCount = propertiesCountResult.count ?? 0
  const servicesCount = servicesCountResult.count ?? 0
  const openLeadsCount = leadsCountResult.count ?? 0
  const overdueCount = invoicesCountResult.count ?? 0
  const todayJobs = (todayJobsResult.data ?? []) as JobRow[]
  const weekJobs = (weekJobsResult.data ?? []) as JobRow[]
  const unassignedCount = unscheduledJobsResult.count ?? 0
  const todayRoute = todayRouteResult.data
    ? ({
        ...todayRouteResult.data,
        stops: [...(todayRouteResult.data.stops ?? [])].sort(
          (a, b) => a.stop_order - b.stop_order,
        ),
      } as TodayRoute)
    : null
  const recentClients = (recentClientsResult.data ?? []) as RecentClient[]

  const week = buildWeekSnapshot(weekJobs, weekStart)
  const activity = buildActivity(recentClients)
  const overbookedDays = week.filter((day) => day.isOverbooked)
  const todaysCompleted = todayJobs.filter((job) => job.status === "completed").length

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Clients"
          value={clientsCount}
          sub={`${propertiesCount} propert${propertiesCount === 1 ? "y" : "ies"}`}
          icon={Users}
        />
        <KpiCard
          title="Properties"
          value={propertiesCount}
          sub="Service locations"
          icon={Building2}
        />
        <KpiCard
          title="Service Types"
          value={servicesCount}
          sub="Catalog items"
          icon={PackageCheck}
        />
        <KpiCard
          title="Today's Jobs"
          value={todayJobs.length}
          sub={`${todaysCompleted} completed`}
          icon={ClipboardList}
        />
      </div>

      {(overbookedDays.length > 0 || unassignedCount > 0 || overdueCount > 0 || openLeadsCount > 0) && (
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
          {openLeadsCount > 0 && (
            <AlertCard
              icon={Users}
              colorClass="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
              label={`${openLeadsCount} open lead${openLeadsCount > 1 ? "s" : ""}`}
              action={{ label: "View Leads", href: "/leads" }}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RoutePreview route={todayRoute} />
        </div>
        <div className="lg:col-span-2">
          <WeekSnapshot days={week} />
        </div>
      </div>

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
        {action.label} -&gt;
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
