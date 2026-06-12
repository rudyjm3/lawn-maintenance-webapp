import { LeadsView } from "@/components/leads/leads-view"
import { createClient } from "@/lib/supabase/server"
import type { Lead } from "@/types"

export const metadata = { title: "Leads" }

export default async function LeadsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const leadsResult = await db
    .from("leads")
    .select("id, name, email, phone, service_address, requested_services, status, source, created_at, converted_client_id, converted_at")
    .order("created_at", { ascending: false })

  const leads = (leadsResult.data ?? []) as Lead[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} total lead{leads.length !== 1 ? "s" : ""}
        </p>
      </div>

      <LeadsView leads={leads} />
    </div>
  )
}
