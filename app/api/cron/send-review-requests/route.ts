import { NextRequest, NextResponse } from "next/server"
import { addUtcDaysToIso, todayUtc } from "@/lib/dates"
import { sendReviewRequestEmail } from "@/lib/email/send-review-request"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })

  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const yesterday = addUtcDaysToIso(todayUtc(), -1)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.greenroute.app"

  const { data: businesses, error: bizError } = await admin
    .from("businesses")
    .select("id, business_name")

  if (bizError) return NextResponse.json({ error: bizError.message }, { status: 500 })

  const results: { businessId: string; sent: number; error?: string }[] = []

  for (const business of businesses ?? []) {
    try {
      const { data: jobs, error: jobsError } = await db
        .from("jobs")
        .select(`
          id, title, review_token, service_date, client_id,
          client:clients(id, name, email),
          property:properties(id, address),
          property_service:property_services(service_type:service_types(name))
        `)
        .eq("business_id", business.id)
        .eq("status", "completed")
        .eq("service_date", yesterday)
        .is("review_submitted_at", null)
        .not("review_token", "is", null)

      if (jobsError) throw new Error(jobsError.message)

      let sent = 0

      for (const job of jobs ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (Array.isArray(job.client) ? job.client[0] : job.client) as any
        if (!client?.email) continue

        const { data: reservation } = await db
          .from("job_reminders")
          .upsert(
            { business_id: business.id, job_id: job.id, reminder_type: "review_request" },
            { onConflict: "job_id,reminder_type", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle()

        if (!reservation) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propSvc = (Array.isArray(job.property_service) ? job.property_service[0] : job.property_service) as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svcType = (Array.isArray(propSvc?.service_type) ? propSvc.service_type[0] : propSvc?.service_type) as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const property = (Array.isArray(job.property) ? job.property[0] : job.property) as any

        const reviewUrl = `${appUrl}/review/${job.review_token}`

        await db
          .from("jobs")
          .update({ review_requested_at: new Date().toISOString() })
          .eq("id", job.id)

        const result = await sendReviewRequestEmail({
          clientName: client.name,
          clientEmail: client.email,
          serviceName: job.title ?? svcType?.name ?? "Service",
          address: property?.address ?? "your property",
          serviceDate: yesterday,
          businessName: business.business_name,
          reviewUrl,
        })

        if (result.success) {
          await admin.from("communications").insert({
            business_id: business.id,
            client_id: job.client_id,
            job_id: job.id,
            channel: "email",
            direction: "outbound",
            message: `Review request sent for ${job.title ?? svcType?.name ?? "Service"}`,
          })
          sent++
        }
      }

      results.push({ businessId: business.id, sent })
    } catch (err) {
      results.push({
        businessId: business.id,
        sent: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({
    yesterday,
    totalSent: results.reduce((s, r) => s + r.sent, 0),
    results,
  })
}
