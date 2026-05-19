import { createClient } from "@/lib/supabase/server"
import { InvoicesTable } from "@/components/invoices/invoices-table"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Receipt, DollarSign, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { Invoice, Client } from "@/types"

export const dynamic = "force-dynamic"
export const metadata = { title: "Invoices" }

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [invoicesResult, clientsResult] = await Promise.all([
    db
      .from("invoices")
      .select("*, client:clients(id, name, email, phone)")
      .order("created_at", { ascending: false }),
    db
      .from("clients")
      .select("id, name, email, phone, billing_address, status, source, notes, created_at")
      .eq("status", "active")
      .order("name"),
  ])

  const invoices = (invoicesResult.data ?? []) as Invoice[]
  const clients = (clientsResult.data ?? []) as Client[]

  const totalInvoiced = invoices
    .filter((inv) => inv.status !== "void")
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const outstanding = invoices
    .filter((inv) => ["draft", "sent", "partial", "overdue"].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length
  const paidCount = invoices.filter((inv) => inv.status === "paid").length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Invoiced"
          value={fmt$(totalInvoiced)}
          sub="All active invoices"
          icon={Receipt}
        />
        <KpiCard
          title="Outstanding"
          value={fmt$(outstanding)}
          sub="Awaiting payment"
          icon={DollarSign}
        />
        <KpiCard
          title="Overdue"
          value={overdueCount}
          sub="Past due date"
          icon={AlertTriangle}
        />
        <KpiCard
          title="Paid"
          value={paidCount}
          sub="Fully collected"
          icon={CheckCircle2}
        />
      </div>

      <InvoicesTable invoices={invoices} clients={clients} />
    </div>
  )
}
