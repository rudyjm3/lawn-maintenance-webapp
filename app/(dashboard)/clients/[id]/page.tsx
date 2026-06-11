import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Phone,
  Mail,
  PlusCircle,
  Receipt,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SendEmailDialog } from "@/components/clients/send-email-dialog"
import { normalizeJobRows } from "@/lib/jobs"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs"
import { ClientAutopayCard } from "@/components/clients/client-autopay-card"
import { createClient } from "@/lib/supabase/server"
import type { Client, Property, Job, ServiceType, PropertyService, Communication, Estimate, Invoice } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; jobId?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db.from("clients").select("name").eq("id", id).single()
  return { title: data?.name ?? "Client" }
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab: initialTab, jobId: highlightJobId } = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: client } = await db.from("clients").select("*").eq("id", id).single()
  if (!client) notFound()

  const { data: properties } = await db
    .from("properties")
    .select("*")
    .eq("client_id", id)
    .order("address")

  const propertyIds = ((properties ?? []) as Property[]).map((p) => p.id)

  const [jobsResult, serviceTypesResult, propertyServicesResult, commsResult, billingSettingsResult, invoicesResult, estimatesResult, reviewsResult] = await Promise.all([
    db
      .from("jobs")
      .select("*, property:properties(*), property_service:property_services(*, service_type:service_types(*))")
      .eq("client_id", id)
      .order("service_date", { ascending: false }),
    db.from("service_types").select("*").order("name"),
    propertyIds.length > 0
      ? db
          .from("property_services")
          .select("*, service_type:service_types(*), recurrence_rules(*, schedule_exceptions(*))")
          .in("property_id", propertyIds)
      : Promise.resolve({ data: [] }),
    db
      .from("communications")
      .select("*")
      .eq("client_id", id)
      .order("sent_at", { ascending: false }),
    db
      .from("client_billing_settings")
      .select("autopay_enabled, stripe_default_payment_method_brand, stripe_default_payment_method_last4")
      .eq("client_id", id)
      .maybeSingle(),
    db
      .from("invoices")
      .select("*, client:clients(id, name), payments:payments(amount, payment_date)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("estimates")
      .select("*, client:clients(id, name)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("jobs")
      .select("id, title, service_date, review_rating, review_text, review_submitted_at")
      .eq("client_id", id)
      .not("review_submitted_at", "is", null)
      .order("review_submitted_at", { ascending: false }),
  ])

  const jobs = normalizeJobRows((jobsResult.data ?? []) as Record<string, unknown>[]) as Job[]
  const serviceTypes = (serviceTypesResult.data ?? []) as ServiceType[]
  const propertyServices = (propertyServicesResult.data ?? []) as PropertyService[]
  const communications = (commsResult.data ?? []) as Communication[]
  const invoices = (invoicesResult.data ?? []) as Invoice[]
  const estimates = (estimatesResult.data ?? []) as Estimate[]
  type ReviewJob = { id: string; title: string | null; service_date: string | null; review_rating: number | null; review_text: string | null; review_submitted_at: string | null }
  const reviews = (reviewsResult.data ?? []) as ReviewJob[]
  const revenueEarned = jobs
    .filter((j) => j.status === "completed")
    .reduce((sum, j) => sum + Number(j.price), 0)
  const revenueCollected = invoices.reduce(
    (sum, inv) => sum + (inv.payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0),
    0,
  )
  const outstandingBalance = invoices
    .filter((inv) => ["sent", "partial", "overdue"].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const allPayments = invoices.flatMap((inv) => inv.payments ?? [])
  const lastPaymentDate =
    allPayments.length > 0
      ? allPayments.sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0]?.payment_date ?? null
      : null
  const billingSettings = (billingSettingsResult.data ?? null) as
    | { autopay_enabled: boolean; stripe_default_payment_method_brand: string | null; stripe_default_payment_method_last4: string | null }
    | null

  return (
    <div className="space-y-6">
      {/* ── Back nav ── */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Clients
      </Link>

      {/* ── Client header card ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: name + metadata */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">
                {(client as Client).name}
              </h1>
              <ClientStatusBadge status={(client as Client).status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {(client as Client).phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {(client as Client).phone}
                </span>
              )}
              {(client as Client).email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {(client as Client).email}
                </span>
              )}
              {(properties ?? []).length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {(properties ?? []).length} propert
                  {(properties ?? []).length !== 1 ? "ies" : "y"}
                </span>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {(client as Client).phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${(client as Client).phone}`}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Call
                </a>
              </Button>
            )}
            {(client as Client).email && (
              <SendEmailDialog
                clientId={id}
                clientName={(client as Client).name}
                clientEmail={(client as Client).email!}
              />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/jobs?client=${id}&new=1`}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add Job
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/invoices?client=${id}&new=1`}>
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                Invoice
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabbed detail ── */}
      <ClientDetailTabs
        client={client as Client}
        properties={(properties ?? []) as Property[]}
        jobs={jobs}
        serviceTypes={serviceTypes}
        propertyServices={propertyServices}
        communications={communications}
        estimates={estimates}
        invoices={invoices}
        reviews={reviews}
        initialTab={initialTab}
        highlightJobId={highlightJobId}
        revenueSummary={{
          earned: revenueEarned,
          collected: revenueCollected,
          outstanding: outstandingBalance,
          paymentCount: allPayments.length,
          lastPaymentDate,
        }}
      />
      <ClientAutopayCard
        clientId={id}
        autopayEnabled={billingSettings?.autopay_enabled ?? false}
        paymentMethodBrand={billingSettings?.stripe_default_payment_method_brand ?? null}
        paymentMethodLast4={billingSettings?.stripe_default_payment_method_last4 ?? null}
      />
    </div>
  )
}
