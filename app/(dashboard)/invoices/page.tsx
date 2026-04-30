import Link from "next/link"
import { LayoutList } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { InvoicesTable } from "@/components/invoices/invoices-table"
import { GenerateFromJobsDialog } from "@/components/invoices/generate-from-jobs-dialog"
import { Button } from "@/components/ui/button"
import type { Invoice, Client, Job } from "@/types"

export const metadata = { title: "Invoices" }

export default async function InvoicesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [invoicesResult, clientsResult, completedJobsResult, invoicedJobIdsResult] =
    await Promise.all([
      db
        .from("invoices")
        .select("*, client:clients(id, name)")
        .order("created_at", { ascending: false }),
      db
        .from("clients")
        .select("id, name, email, phone, billing_address, status, source, notes, created_at")
        .eq("status", "active")
        .order("name"),
      db
        .from("jobs")
        .select(
          "id, client_id, property_id, price, service_date, status, estimated_duration_min, actual_duration_min, photo_required, business_id, created_at, service_type:service_types(name), property:properties(address)",
        )
        .eq("status", "completed")
        .order("service_date", { ascending: false }),
      // Get all job_ids that already appear on an invoice
      db.from("invoice_items").select("job_id").not("job_id", "is", null),
    ])

  const invoices = (invoicesResult.data ?? []) as Invoice[]
  const clients = (clientsResult.data ?? []) as Client[]

  const invoicedJobIds = new Set<string>(
    ((invoicedJobIdsResult.data ?? []) as { job_id: string }[]).map((r) => r.job_id),
  )
  const uninvoicedJobs = ((completedJobsResult.data ?? []) as Job[]).filter(
    (j) => !invoicedJobIds.has(j.id),
  )

  // KPI calculations
  const unpaidInvoices = invoices.filter((i) => i.status === "sent" || i.status === "partial")
  const overdueInvoices = invoices.filter((i) => i.status === "overdue")
  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total), 0)
  const outstandingTotal = [...unpaidInvoices, ...overdueInvoices].reduce(
    (sum, i) => sum + Number(i.total),
    0,
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {invoices.length} total · {uninvoicedJobs.length} completed job{uninvoicedJobs.length !== 1 ? "s" : ""} ready to invoice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices/batch">
              <LayoutList className="h-4 w-4 mr-1.5" />
              Batch Invoice
            </Link>
          </Button>
          <GenerateFromJobsDialog clients={clients} uninvoicedJobs={uninvoicedJobs} />
        </div>
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Invoices", value: invoices.length },
            { label: "Outstanding", value: `$${outstandingTotal.toFixed(2)}` },
            { label: "Overdue", value: overdueInvoices.length },
            { label: "Collected", value: `$${paidTotal.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      <InvoicesTable invoices={invoices} />
    </div>
  )
}
