import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { EstimateDetailCard } from "@/components/estimates/estimate-detail-card"
import { SendEstimateButton } from "@/components/estimates/send-estimate-button"
import type { Estimate, Property } from "@/types"

export const metadata = { title: "Estimate Detail" }

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: estimate, error } = await db
    .from("estimates")
    .select("*, client:clients(id, name, email, phone, billing_address, status, source, notes, created_at), items:estimate_items(*)")
    .eq("id", id)
    .single()

  if (error || !estimate) notFound()

  const est = estimate as Estimate

  // Load properties for this client (for convert-to-plan)
  const { data: propertiesData } = est.client_id
    ? await db
        .from("properties")
        .select("id, address, client_id, business_id, lat, lng, access_notes, gate_code, pet_notes, lawn_size, is_commercial")
        .eq("client_id", est.client_id)
        .order("address")
    : { data: [] }

  const properties = (propertiesData ?? []) as Property[]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/estimates"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Estimates
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{est.estimate_number}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{est.estimate_number}</h1>
          <p className="text-sm text-muted-foreground">
            Created {new Date(est.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        {est.status === "draft" && <SendEstimateButton estimateId={est.id} />}
      </div>

      <EstimateDetailCard estimate={est} properties={properties} />
    </div>
  )
}
