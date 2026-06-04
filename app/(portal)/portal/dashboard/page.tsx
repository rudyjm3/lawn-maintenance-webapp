import { redirect } from "next/navigation"
import Link from "next/link"
import { CalendarDays, Receipt, CheckCircle2, Star, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getPortalClientId } from "@/lib/portal/auth"
import { portalSignOut } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"

export const metadata = { title: "My Services" }

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const clientId = await getPortalClientId(supabase)
  if (!clientId) redirect("/portal/login")

  const today = new Date().toISOString().slice(0, 10)
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const [clientResult, upcomingResult, invoicesResult, recentResult] = await Promise.all([
    db.from("clients").select("name").eq("id", clientId).single(),
    db
      .from("jobs")
      .select("id, title, service_date, status, estimated_duration_min, property_service:property_services(service_type:service_types(name)), property:properties(address)")
      .eq("client_id", clientId)
      .in("status", ["scheduled", "in_progress"])
      .gte("service_date", today)
      .lte("service_date", in30Days)
      .order("service_date"),
    db
      .from("invoices")
      .select("id, invoice_number, status, total, due_date, stripe_payment_link")
      .eq("client_id", clientId)
      .in("status", ["sent", "partial", "overdue"])
      .order("due_date"),
    db
      .from("jobs")
      .select("id, title, service_date, actual_duration_min, review_rating, property_service:property_services(service_type:service_types(name))")
      .eq("client_id", clientId)
      .eq("status", "completed")
      .order("service_date", { ascending: false })
      .limit(5),
  ])

  const clientName = clientResult.data?.name ?? "Client"

  type UpcomingJob = { id: string; title: string | null; service_date: string | null; status: string; estimated_duration_min: number; property_service: { service_type: { name: string } | { name: string }[] | null } | { service_type: { name: string } | { name: string }[] | null }[] | null; property: { address: string } | { address: string }[] | null }
  const upcoming = (upcomingResult.data ?? []) as UpcomingJob[]

  type InvoiceRow = { id: string; invoice_number: string; status: string; total: number; due_date: string | null; stripe_payment_link: string | null }
  const openInvoices = (invoicesResult.data ?? []) as InvoiceRow[]

  type RecentJob = { id: string; title: string | null; service_date: string | null; actual_duration_min: number | null; review_rating: number | null; property_service: { service_type: { name: string } | null } | null }
  const recentJobs = (recentResult.data ?? []) as RecentJob[]

  function norm<T>(v: T | T[] | null): T | null {
    if (Array.isArray(v)) return v[0] ?? null
    return v
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Welcome, {clientName}</h1>
          <p className="text-sm text-muted-foreground">Your lawn care portal</p>
        </div>
        <form action={portalSignOut}>
          <Button variant="ghost" size="sm" type="submit" className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>

      {/* Upcoming services */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-foreground">Upcoming Services</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming services in the next 30 days.</p>
        ) : (
          <div className="divide-y divide-border">
            {upcoming.map((j) => {
              const propSvc = norm(j.property_service)
              const svcType = norm(propSvc?.service_type ?? null) as { name: string } | null
              const property = norm(j.property) as { address: string } | null
              return (
                <div key={j.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{j.title ?? svcType?.name ?? "Service"}</p>
                    {property?.address && <p className="text-xs text-muted-foreground">{property.address}</p>}
                  </div>
                  <p className="text-sm text-muted-foreground shrink-0">
                    {j.service_date ? new Date(j.service_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "—"}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Open invoices */}
      {openInvoices.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Open Invoices</h2>
          </div>
          <div className="divide-y divide-border">
            {openInvoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Invoice #{inv.invoice_number}</p>
                  {inv.due_date && <p className="text-xs text-muted-foreground">Due {new Date(inv.due_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${Number(inv.total).toFixed(2)}</span>
                  <Link href={`/portal/invoices/${inv.id}`} className="text-xs text-primary hover:underline">View</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent completed jobs */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-foreground">Recent Services</h2>
        </div>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed services yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentJobs.map((j) => (
              <div key={j.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{j.title ?? "Service"}</p>
                  {j.service_date && <p className="text-xs text-muted-foreground">{new Date(j.service_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</p>}
                </div>
                {j.review_rating ? (
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= (j.review_rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                ) : (
                  <Link href={`/portal/reviews`} className="text-xs text-primary hover:underline">Leave review</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
