import { NextRequest, NextResponse } from "next/server"
import { addUtcDaysToIso, todayUtc } from "@/lib/dates"
import { sendAppointmentReminderEmail } from "@/lib/email/send-appointment-reminder"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })

  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const tomorrow = addUtcDaysToIso(todayUtc(), 1)

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: true })

  if (businessesError) return NextResponse.json({ error: businessesError.message }, { status: 500 })

  const results: Array<{
    businessId: string
    businessName: string
    emailsSent: number
    error?: string
  }> = []

  for (const business of businesses ?? []) {
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
          id, title, status, estimated_duration_min, client_id,
          client:clients(id, name, email),
          property:properties(id, address),
          property_service:property_services(
            id,
            service_type:service_types(id, name)
          )
        `)
        .eq("business_id", business.id)
        .eq("service_date", tomorrow)
        .eq("status", "scheduled")

      if (jobsError) throw new Error(jobsError.message)

      let emailsSent = 0

      for (const job of jobs ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (Array.isArray(job.client) ? job.client[0] : job.client) as any
        if (!client?.email) continue

        const { data: existing } = await db
          .from("job_reminders")
          .select("id")
          .eq("job_id", job.id)
          .eq("reminder_type", "day_before")
          .maybeSingle()

        if (existing) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propSvc = (Array.isArray(job.property_service) ? job.property_service[0] : job.property_service) as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svcType = (Array.isArray(propSvc?.service_type) ? propSvc.service_type[0] : propSvc?.service_type) as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const property = (Array.isArray(job.property) ? job.property[0] : job.property) as any

        const result = await sendAppointmentReminderEmail({
          clientName: client.name,
          clientEmail: client.email,
          serviceName: job.title ?? svcType?.name ?? "Service",
          address: property?.address ?? "your property",
          serviceDate: tomorrow,
          businessName: business.business_name,
          estimatedDurationMin: job.estimated_duration_min,
        })

        if (result.success) {
          await db.from("job_reminders").insert({
            business_id: business.id,
            job_id: job.id,
            reminder_type: "day_before",
          })

          await supabase.from("communications").insert({
            business_id: business.id,
            client_id: job.client_id,
            job_id: job.id,
            channel: "email",
            direction: "outbound",
            message: `Appointment reminder sent for ${job.title ?? svcType?.name ?? "Service"} on ${tomorrow}`,
          })

          emailsSent++
        }
      }

      results.push({ businessId: business.id, businessName: business.business_name, emailsSent })
    } catch (error) {
      results.push({
        businessId: business.id,
        businessName: business.business_name,
        emailsSent: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({
    tomorrow,
    totalEmailsSent: results.reduce((sum, r) => sum + r.emailsSent, 0),
    failedBusinesses: results.filter((r) => !!r.error).length,
    results,
  })
}
