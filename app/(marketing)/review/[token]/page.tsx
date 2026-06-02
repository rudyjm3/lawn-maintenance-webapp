import { notFound } from "next/navigation"
import { Leaf } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { ReviewForm } from "./review-form"

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return { title: token ? "Leave a Review" : "Review" }
}

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: job } = await db
    .from("jobs")
    .select(`
      id, title, service_date, review_submitted_at, business_id,
      client:clients(name),
      property:properties(address),
      property_service:property_services(service_type:service_types(name))
    `)
    .eq("review_token", token)
    .maybeSingle()

  if (!job) notFound()

  const { data: business } = await db
    .from("businesses")
    .select("business_name")
    .eq("id", job.business_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (Array.isArray(job.client) ? job.client[0] : job.client) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = (Array.isArray(job.property) ? job.property[0] : job.property) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propSvc = (Array.isArray(job.property_service) ? job.property_service[0] : job.property_service) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svcType = (Array.isArray(propSvc?.service_type) ? propSvc.service_type[0] : propSvc?.service_type) as any

  const serviceName = job.title ?? svcType?.name ?? "Service"
  const alreadySubmitted = !!job.review_submitted_at

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto max-w-lg flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-foreground">{business?.business_name ?? "GreenRoute"}</span>
        </div>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-xl border border-border bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-1">Rate your service</h1>
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">{serviceName}</span></p>
              {property?.address && <p>{property.address}</p>}
              {job.service_date && <p>{new Date(job.service_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</p>}
              {client?.name && <p>Client: {client.name}</p>}
            </div>
          </div>

          {alreadySubmitted ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-center">
              <p className="font-semibold text-emerald-800">Review already submitted</p>
              <p className="text-sm text-emerald-700 mt-1">Thank you for your feedback!</p>
            </div>
          ) : (
            <ReviewForm token={token} />
          )}
        </div>
      </main>
    </div>
  )
}
