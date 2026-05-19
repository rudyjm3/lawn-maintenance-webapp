import { createClient } from "@/lib/supabase/server"
import { EstimatesTable } from "@/components/estimates/estimates-table"
import { CreateEstimateSheet } from "@/components/estimates/create-estimate-sheet"
import type { Estimate, Client, ServiceType } from "@/types"

export const metadata = { title: "Estimates" }

export default async function EstimatesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [estimatesResult, clientsResult, serviceTypesResult] = await Promise.all([
    db
      .from("estimates")
      .select("*, client:clients(id, name)")
      .order("created_at", { ascending: false }),
    db
      .from("clients")
      .select("id, name, email, phone, billing_address, status, source, notes, created_at")
      .eq("status", "active")
      .order("name"),
    db
      .from("service_types")
      .select("id, name, default_duration_min, default_price, is_recurring, is_seasonal")
      .order("name"),
  ])

  const estimates = (estimatesResult.data ?? []) as Estimate[]
  const clients = (clientsResult.data ?? []) as Client[]
  const serviceTypes = (serviceTypesResult.data ?? []) as ServiceType[]

  const draftCount = estimates.filter((e) => e.status === "draft").length
  const sentCount = estimates.filter((e) => e.status === "sent").length
  const approvedCount = estimates.filter((e) => e.status === "approved").length
  const totalValue = estimates
    .filter((e) => e.status !== "rejected")
    .reduce((sum, e) => sum + Number(e.total), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            {estimates.length} total · {draftCount} draft · {sentCount} sent · {approvedCount} approved
          </p>
        </div>
        <CreateEstimateSheet clients={clients} serviceTypes={serviceTypes} />
      </div>

      {/* KPI strip */}
      {estimates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Estimates", value: estimates.length },
            { label: "Awaiting Response", value: sentCount },
            { label: "Approved", value: approvedCount },
            { label: "Pipeline Value", value: `$${totalValue.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      <EstimatesTable estimates={estimates} />
    </div>
  )
}
