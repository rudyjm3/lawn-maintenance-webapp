import { createClient } from "@/lib/supabase/server"
import { EstimatesTable } from "@/components/estimates/estimates-table"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { FileText, SendHorizonal, ThumbsUp, Clock } from "lucide-react"
import type { Estimate, Client } from "@/types"

export const dynamic = "force-dynamic"
export const metadata = { title: "Estimates" }

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export default async function EstimatesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [estimatesResult, clientsResult] = await Promise.all([
    db
      .from("estimates")
      .select("*, client:clients(id, name, email, phone), items:estimate_items(*)")
      .order("created_at", { ascending: false }),
    db
      .from("clients")
      .select("id, name, email, phone, billing_address, status, source, notes, created_at")
      .eq("status", "active")
      .order("name"),
  ])

  const estimates = (estimatesResult.data ?? []) as Estimate[]
  const clients = (clientsResult.data ?? []) as Client[]

  const totalEstimated = estimates
    .filter((e) => e.status !== "rejected")
    .reduce((sum, e) => sum + Number(e.total), 0)
  const sentCount = estimates.filter((e) => e.status === "sent").length
  const approvedCount = estimates.filter((e) => e.status === "approved").length
  const approvedValue = estimates
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + Number(e.total), 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Estimates</h1>
        <p className="text-sm text-muted-foreground">
          {estimates.length} estimate{estimates.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total Estimated"
          value={fmt$(totalEstimated)}
          sub="Active estimates"
          icon={FileText}
        />
        <KpiCard
          title="Awaiting Response"
          value={sentCount}
          sub="Sent, pending approval"
          icon={SendHorizonal}
        />
        <KpiCard
          title="Approved"
          value={approvedCount}
          sub="Ready to convert"
          icon={ThumbsUp}
        />
        <KpiCard
          title="Approved Value"
          value={fmt$(approvedValue)}
          sub="Won estimate total"
          icon={Clock}
        />
      </div>

      <EstimatesTable estimates={estimates} clients={clients} />
    </div>
  )
}
