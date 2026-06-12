"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { sendRescheduleNotification } from "@/lib/email/send-reschedule-notification"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RescheduleJob {
  id: string
  title: string | null
  client_id: string
  client_name: string
  client_email: string | null
  property_address: string
  service_name: string | null
  on_route: boolean
  est_arrival: string | null // HH:MM or null
}

export interface DateCapacity {
  date: string
  jobCount: number
}

export interface RescheduleRequest {
  id: string
  job_id: string
  client_id: string
  client_name: string | null
  service_name: string | null
  property_address: string | null
  original_date: string
  proposed_date: string
  status: string
  client_chosen_date: string | null
  created_at: string
  responded_at: string | null
}

// ─── Fetch jobs for a specific date ───────────────────────────────────────────

export async function fetchJobsForDate(date: string): Promise<RescheduleJob[]> {
  const supabase = await createClient()
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from("jobs")
    .select(`
      id, title, client_id,
      client:clients(id, name, email),
      property:properties(address),
      property_service:property_services(service_type:service_types(name)),
      route_stops(id, est_arrival)
    `)
    .eq("business_id", businessId)
    .eq("service_date", date)
    .in("status", ["scheduled", "unscheduled"])

  return ((data ?? []) as Record<string, unknown>[]).map((j) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (Array.isArray(j.client) ? (j.client as any[])[0] : j.client) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const property = (Array.isArray(j.property) ? (j.property as any[])[0] : j.property) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propSvc = (Array.isArray(j.property_service) ? (j.property_service as any[])[0] : j.property_service) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svcType = (Array.isArray(propSvc?.service_type) ? (propSvc.service_type as any[])[0] : propSvc?.service_type) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stops = (j.route_stops as any[]) ?? []
    const firstStop = stops[0] as { id: string; est_arrival: string | null } | undefined

    return {
      id: j.id as string,
      title: (j.title as string | null) ?? null,
      client_id: client?.id ?? "",
      client_name: client?.name ?? "Unknown client",
      client_email: client?.email ?? null,
      property_address: property?.address ?? "Unknown address",
      service_name: svcType?.name ?? null,
      on_route: stops.length > 0,
      est_arrival: firstStop?.est_arrival ?? null,
    }
  })
}

// ─── Fetch job counts per date for capacity display ──────────────────────────

export async function fetchDateCapacities(dates: string[]): Promise<DateCapacity[]> {
  if (dates.length === 0) return []
  const supabase = await createClient()
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from("jobs")
    .select("service_date")
    .eq("business_id", businessId)
    .in("service_date", dates)
    .in("status", ["scheduled", "unscheduled", "in_progress"])

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { service_date: string }[]) {
    counts[row.service_date] = (counts[row.service_date] ?? 0) + 1
  }

  return dates.map((date) => ({ date, jobCount: counts[date] ?? 0 }))
}

// ─── Main reschedule + notify action ─────────────────────────────────────────

const RescheduleSchema = z.object({
  jobIds: z.array(z.string().uuid()).min(1),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sendNotifications: z.boolean(),
})

export async function rescheduleSelectedJobs(params: {
  jobIds: string[]
  fromDate: string
  toDate: string
  sendNotifications: boolean
}): Promise<{ success: boolean; message: string; movedCount?: number; notifiedCount?: number }> {
  const parsed = RescheduleSchema.safeParse(params)
  if (!parsed.success) return { success: false, message: "Invalid parameters." }

  const { jobIds, fromDate, toDate, sendNotifications } = parsed.data

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch full job details (scoped to this business) for the selected IDs
  const { data: jobs, error: fetchError } = await db
    .from("jobs")
    .select(`
      id, title, client_id, business_id,
      client:clients(id, name, email),
      property:properties(address),
      property_service:property_services(service_type:service_types(name))
    `)
    .eq("business_id", businessId)
    .in("id", jobIds)
    .eq("service_date", fromDate)
    .in("status", ["scheduled", "unscheduled"])

  if (fetchError) return { success: false, message: fetchError.message }
  if (!jobs || jobs.length === 0) return { success: false, message: "No movable jobs found for the selected IDs." }

  const verifiedIds = (jobs as { id: string }[]).map((j) => j.id)

  // Move jobs to the new date
  const { error: updateError } = await db
    .from("jobs")
    .update({ service_date: toDate, status: "scheduled" })
    .in("id", verifiedIds)
    .eq("business_id", businessId)

  if (updateError) return { success: false, message: updateError.message }

  // Remove route_stops for rescheduled jobs so crew doesn't see them on the original rain-day route
  const { error: stopsError } = await db
    .from("route_stops")
    .delete()
    .in("job_id", verifiedIds)
    .eq("business_id", businessId)

  if (stopsError) return { success: false, message: stopsError.message }

  // Fetch business info for email
  let businessName = "GreenRoute"
  let businessPhone: string | null = null
  if (sendNotifications) {
    const { data: biz } = await db.from("businesses").select("business_name, phone").eq("id", businessId).single()
    businessName = biz?.business_name ?? "GreenRoute"
    businessPhone = biz?.phone ?? null
  }

  // Create reschedule_request records and send emails
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = admin as any
  let notifiedCount = 0

  for (const job of jobs as Record<string, unknown>[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (Array.isArray(job.client) ? (job.client as any[])[0] : job.client) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const property = (Array.isArray(job.property) ? (job.property as any[])[0] : job.property) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propSvc = (Array.isArray(job.property_service) ? (job.property_service as any[])[0] : job.property_service) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svcType = (Array.isArray(propSvc?.service_type) ? (propSvc.service_type as any[])[0] : propSvc?.service_type) as any

    // Upsert reschedule_request (ignore duplicate if already rescheduled for this job+date)
    const { data: req } = await adminDb
      .from("reschedule_requests")
      .upsert(
        {
          business_id: businessId,
          job_id: job.id,
          client_id: client?.id ?? job.client_id,
          original_date: fromDate,
          proposed_date: toDate,
          status: "pending",
        },
        { onConflict: "job_id,original_date", ignoreDuplicates: false }
      )
      .select("token")
      .maybeSingle()

    if (sendNotifications && client?.email && req?.token) {
      const result = await sendRescheduleNotification({
        clientName: client.name ?? "Valued Customer",
        clientEmail: client.email,
        serviceName: (job.title as string | null) ?? svcType?.name ?? "Lawn Service",
        address: property?.address ?? "",
        originalDate: fromDate,
        proposedDate: toDate,
        token: req.token,
        businessName,
        businessPhone,
      })
      if (result.success) notifiedCount++
    }
  }

  revalidatePath("/schedule")
  revalidatePath("/dashboard")
  revalidatePath("/jobs")

  const msg = sendNotifications
    ? `${verifiedIds.length} job${verifiedIds.length !== 1 ? "s" : ""} rescheduled, ${notifiedCount} client${notifiedCount !== 1 ? "s" : ""} notified.`
    : `${verifiedIds.length} job${verifiedIds.length !== 1 ? "s" : ""} rescheduled.`

  return { success: true, message: msg, movedCount: verifiedIds.length, notifiedCount }
}

// ─── Fetch pending reschedule requests for owner dashboard ───────────────────

export async function fetchPendingReschedules(): Promise<RescheduleRequest[]> {
  const supabase = await createClient()
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from("reschedule_requests")
    .select(`
      id, job_id, client_id, original_date, proposed_date, status,
      client_chosen_date, created_at, responded_at,
      client:clients(name),
      job:jobs(title),
      property:properties!jobs(address)
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50)

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (Array.isArray(r.client) ? (r.client as any[])[0] : r.client) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = (Array.isArray(r.job) ? (r.job as any[])[0] : r.job) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const property = (Array.isArray(r.property) ? (r.property as any[])[0] : r.property) as any
    return {
      id: r.id as string,
      job_id: r.job_id as string,
      client_id: r.client_id as string,
      client_name: client?.name ?? null,
      service_name: job?.title ?? null,
      property_address: property?.address ?? null,
      original_date: r.original_date as string,
      proposed_date: r.proposed_date as string,
      status: r.status as string,
      client_chosen_date: (r.client_chosen_date as string | null) ?? null,
      created_at: r.created_at as string,
      responded_at: (r.responded_at as string | null) ?? null,
    }
  })
}
