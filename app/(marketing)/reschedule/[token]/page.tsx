import { notFound } from "next/navigation"
import { Leaf } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { ResponseForm } from "./response-form"

export async function generateMetadata() {
  return { title: "Service Reschedule" }
}

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })
}

export default async function ReschedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: req } = await db
    .from("reschedule_requests")
    .select(`
      id, token, original_date, proposed_date, status, client_chosen_date, business_id,
      client:clients(name),
      job:jobs(id, title, property:properties(address))
    `)
    .eq("token", token)
    .maybeSingle()

  if (!req) notFound()

  const { data: biz } = await db
    .from("businesses")
    .select("business_name, phone")
    .eq("id", req.business_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (Array.isArray(req.client) ? (req.client as any[])[0] : req.client) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = (Array.isArray(req.job) ? (req.job as any[])[0] : req.job) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = (Array.isArray(job?.property) ? (job.property as any[])[0] : job?.property) as any

  const businessName: string = biz?.business_name ?? "GreenRoute"
  const businessPhone: string | null = biz?.phone ?? null
  const alreadyResponded = req.status !== "pending"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto max-w-lg flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-foreground">{businessName}</span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          {/* Header card */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">🌧️ Service Rescheduled</p>
            <p className="text-sm text-amber-700">
              Due to forecasted weather we've moved your service. Please let us know if the new date works for you.
            </p>
          </div>

          {/* Service details */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-3">
            <h1 className="text-lg font-semibold text-foreground">
              {client?.name ? `Hi ${client.name},` : "Service Reschedule"}
            </h1>

            <div className="space-y-2 text-sm">
              {job?.title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium text-foreground">{job.title}</span>
                </div>
              )}
              {property?.address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-foreground text-right max-w-[220px]">{property.address}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Was</span>
                <span className="text-destructive line-through text-right">{fmt(req.original_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Now</span>
                <span className="text-green-700 font-semibold text-right">{fmt(req.proposed_date)}</span>
              </div>
            </div>
          </div>

          {/* Response form */}
          <div className="rounded-xl border border-border bg-white p-5">
            <p className="text-sm font-medium text-foreground mb-4">Does the new date work for you?</p>
            <ResponseForm
              token={token}
              proposedDate={req.proposed_date}
              businessPhone={businessPhone}
              alreadyResponded={alreadyResponded}
              initialStatus={req.status}
              initialChosenDate={req.client_chosen_date}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
