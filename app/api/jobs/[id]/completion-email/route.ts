import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { sendJobCompletionEmail } from "@/lib/email/send-job-completion"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params

  // Verify the caller has an active session
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  // Fetch through the RLS-scoped server client — only the caller's business is visible,
  // so a mismatched job_id simply returns 404 instead of leaking another tenant's data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job, error } = await (serverClient as any)
    .from("jobs")
    .select(`
      id, title, status, actual_duration_min, service_date, client_id, business_id,
      client:clients(id, name, email),
      property:properties(id, address),
      property_service:property_services(
        id,
        service_type:service_types(id, name)
      )
    `)
    .eq("id", jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  if (job.status !== "completed") {
    return NextResponse.json({ error: "Job is not completed." }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (Array.isArray(job.client) ? job.client[0] : job.client) as any
  if (!client?.email) {
    return NextResponse.json({ success: false, message: "Client has no email address on file." })
  }

  // Use admin client only for tables that need RLS bypass (job_reminders, communications)
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Atomic reservation: insert before sending so concurrent callers both hit the unique
  // constraint — only the winner proceeds to send; the loser gets null back
  const { data: reservation } = await db
    .from("job_reminders")
    .upsert(
      { business_id: job.business_id, job_id: jobId, reminder_type: "completion" },
      { onConflict: "job_id,reminder_type", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle()

  if (!reservation) {
    return NextResponse.json({ success: true, message: "Completion email already sent." })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propSvc = (Array.isArray(job.property_service) ? job.property_service[0] : job.property_service) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svcType = (Array.isArray(propSvc?.service_type) ? propSvc.service_type[0] : propSvc?.service_type) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = (Array.isArray(job.property) ? job.property[0] : job.property) as any

  const { data: business } = await serverClient
    .from("businesses")
    .select("business_name")
    .eq("id", job.business_id)
    .single()

  const { data: timeLog } = await serverClient
    .from("time_logs")
    .select("notes")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const serviceName = job.title ?? svcType?.name ?? "Service"
  const address = property?.address ?? "your property"

  const result = await sendJobCompletionEmail({
    clientName: client.name,
    clientEmail: client.email,
    serviceName,
    address,
    serviceDate: job.service_date ?? new Date().toISOString().slice(0, 10),
    businessName: business?.business_name ?? "Your lawn service",
    actualDurationMin: job.actual_duration_min,
    notes: timeLog?.notes ?? null,
  })

  if (result.success) {
    await admin.from("communications").insert({
      business_id: job.business_id,
      client_id: job.client_id,
      job_id: jobId,
      channel: "email",
      direction: "outbound",
      message: `Service completion notification sent for ${serviceName}`,
    })
  }

  return NextResponse.json(result)
}
