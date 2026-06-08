import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarX2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Map,
  PackageCheck,
  Receipt,
  Users,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { WeekSnapshot } from "@/components/dashboard/week-snapshot"
import { RoutePreview } from "@/components/dashboard/route-preview"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { WeatherAlertBanner, type AffectedDay } from "@/components/dashboard/weather-alert-banner"
import { type DayWeather } from "@/lib/weather"
import { Button } from "@/components/ui/button"
import { addUtcDays, formatLocalDate, formatUtcDate, startOfWeekUtc } from "@/lib/dates"
import { buildWeekSnapshot } from "@/lib/jobs"
import { fetchWeekForecast } from "@/lib/weather"
import { createClient } from "@/lib/supabase/server"
import type { ActivityItem, Job, Route, RouteStop } from "@/types"

export const dynamic = "force-dynamic"
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
  const weekStart = startOfWeekUtc(new Date())
  const weekEnd = formatUtcDate(addUtcDays(weekStart, 6))

  const now = new Date()
  const mtdStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const mtdEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)

  const [
    clientsCountResult,
    propertiesCountResult,
    servicesCountResult,
    leadsCountResult,
    invoicesCountResult,
    outstandingInvoicesResult,
    mtdPaymentsResult,
    todayJobsResult,
    weekJobsResult,
    unscheduledJobsResult,
    todayRoutesResult,
    recentClientsResult,
    autopayCountResult,
    autoInvoicesCountResult,
    remindersCountResult,
    geoPropsResult,
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
      .from("invoices")
      .select("total")
      .not("status", "in", '("void","paid")')
      .lte("created_at", mtdEnd),
    db
      .from("payments")
      .select("amount")
      .gte("payment_date", mtdStart)
      .lte("payment_date", mtdEnd),
    db
      .from("jobs")
      .select("*, client:clients(name), property:properties(address)")
      .eq("service_date", today)
      .neq("status", "cancelled"),
    db
      .from("jobs")
      .select("*, client:clients(name), property:properties(address)")
      .gte("service_date", formatUtcDate(weekStart))
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
      .order("created_at", { ascending: true }),
    db
      .from("clients")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    db
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("method", "stripe_autopay")
      .eq("payment_date", today),
    db
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("auto_generated", true)
      .eq("auto_generation_batch_date", today),
    db
      .from("invoice_reminders")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", `${today}T00:00:00.000Z`)
      .lt("sent_at", `${today}T23:59:59.999Z`),
    db
      .from("properties")
      .select("lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(50),
  ])

  const clientsCount = clientsCountResult.count ?? 0
  const propertiesCount = propertiesCountResult.count ?? 0
  const servicesCount = servicesCountResult.count ?? 0
  const openLeadsCount = leadsCountResult.count ?? 0
  const overdueCount = invoicesCountResult.count ?? 0
  const outstandingBalance = ((outstandingInvoicesResult.data ?? []) as { total: number }[])
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  const mtdCollected = ((mtdPaymentsResult.data ?? []) as { amount: number }[])
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const todayJobs = (todayJobsResult.data ?? []) as JobRow[]
  const weekJobs = (weekJobsResult.data ?? []) as JobRow[]
  const unassignedCount = unscheduledJobsResult.count ?? 0
  const todayRoutes = ((todayRoutesResult.data ?? []) as TodayRoute[]).map((r) => ({
    ...r,
    stops: [...(r.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order),
  }))
  const recentClients = (recentClientsResult.data ?? []) as RecentClient[]
  const autopayCount = autopayCountResult.count ?? 0
  const autoInvoicesCount = autoInvoicesCountResult.count ?? 0
  const remindersCount = remindersCountResult.count ?? 0

  const week = buildWeekSnapshot(weekJobs, weekStart, CAPACITY_MINUTES)
  const activity = buildActivity(recentClients)
  const overbookedDays = week.filter((day) => day.isOverbooked)
  const todaysCompleted = todayJobs.filter((job) => job.status === "completed").length

  const geoProps = (geoPropsResult.data ?? []) as { lat: number; lng: number }[]
  let weatherAlertDays: AffectedDay[] = []
  let fullForecast: DayWeather[] = []
  if (geoProps.length > 0) {
    const avgLat = geoProps.reduce((s, p) => s + p.lat, 0) / geoProps.length
    const avgLng = geoProps.reduce((s, p) => s + p.lng, 0) / geoProps.length
    const forecast = await fetchWeekForecast(avgLat, avgLng)
    fullForecast = forecast.slice(0, 7)
    weatherAlertDays = fullForecast
      .filter((d) => d.severity === "rain" || d.severity === "severe")
      .map((d) => ({
        date: d.date,
        label: new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        jobCount: weekJobs.filter((j) => j.service_date === d.date).length,
        severity: d.severity as "rain" | "severe",
        icon: d.icon,
        weatherLabel: d.label,
      }))
      .filter((d) => d.jobCount > 0)
  }

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
          title="Today's Jobs"
          value={todayJobs.length}
          sub={`${todaysCompleted} completed`}
          icon={ClipboardList}
        />
        <KpiCard
          title="Outstanding"
          value={outstandingBalance.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          sub="Unpaid invoices"
          icon={Receipt}
        />
        <KpiCard
          title="Collected MTD"
          value={mtdCollected.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
          sub="This month"
          icon={CreditCard}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          title="Open Leads"
          value={openLeadsCount}
          sub="Active pipeline"
          icon={Users}
        />
        <KpiCard
          title="Overdue Invoices"
          value={overdueCount}
          sub="Past due date"
          icon={DollarSign}
        />
      </div>

      <WeatherAlertBanner affectedDays={weatherAlertDays} forecast={fullForecast} />

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
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
              {todayRoutes.length === 0 ? (
                <RoutePreview route={null} />
              ) : (
                todayRoutes.map((r) => <RoutePreview key={r.id} route={r} />)
              )}
            </div>
            <div className="border-t border-border bg-card px-4 py-3">
              <Link
                href="/routes"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                View All Routes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <WeekSnapshot days={week} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ActivityFeed items={activity} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <BillingAutomationCard
            autopayCount={autopayCount}
            autoInvoicesCount={autoInvoicesCount}
            remindersCount={remindersCount}
          />
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

function BillingAutomationCard({
  autopayCount,
  autoInvoicesCount,
  remindersCount,
}: {
  autopayCount: number
  autoInvoicesCount: number
  remindersCount: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Billing Automation (Today)</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">Autopay</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{autopayCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">Auto-Invoices</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{autoInvoicesCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">Reminders</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{remindersCount}</p>
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
