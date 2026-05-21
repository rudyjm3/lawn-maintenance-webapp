"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export type JobActionState =
  | { success: true; message: string }
  | { success: false; message: string }

const OneOffJobSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  property_id: z.string().min(1, "Property is required"),
  title: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  service_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  estimated_duration_min: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  photo_required: z.boolean().default(false),
})

const UpdateJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  estimated_duration_min: z.coerce.number().int().min(1, "Duration must be at least 1 minute"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  photo_required: z.boolean().default(false),
  status: z.enum(["unscheduled", "scheduled", "in_progress", "completed", "skipped", "cancelled"]),
})

export type UpdateJobFormValues = z.infer<typeof UpdateJobSchema>

export async function updateJob(values: UpdateJobFormValues): Promise<JobActionState> {
  const parsed = UpdateJobSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, client_id")
    .eq("id", parsed.data.id)
    .eq("business_id", businessId)
    .maybeSingle()

  if (jobError || !job) return { success: false, message: "Job not found." }

  const { id, title, description, service_date, estimated_duration_min, price, photo_required, status } = parsed.data

  const { error } = await db
    .from("jobs")
    .update({
      title: title || null,
      description: description || null,
      service_date: service_date || null,
      estimated_duration_min,
      price,
      photo_required,
      status,
    })
    .eq("id", id)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/jobs")
  revalidatePath("/schedule")
  revalidatePath("/dashboard")
  revalidatePath(`/clients/${job.client_id}`)
  return { success: true, message: "Job updated." }
}

const JobScheduleSchema = z.object({
  jobId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

const RescheduleDateSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type OneOffJobFormValues = z.infer<typeof OneOffJobSchema>

export async function saveOneOffJob(values: OneOffJobFormValues): Promise<JobActionState> {
  const parsed = OneOffJobSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { client_id, property_id, title, description, service_date, estimated_duration_min, price, photo_required } = parsed.data

  const { data: property, error: propertyError } = await db
    .from("properties")
    .select("id, client_id")
    .eq("id", property_id)
    .eq("business_id", businessId)
    .single()

  if (propertyError || !property) {
    return { success: false, message: propertyError?.message ?? "Property not found." }
  }

  if (property.client_id !== client_id) {
    return { success: false, message: "Property does not belong to the selected client." }
  }

  const row = {
    business_id: businessId,
    client_id,
    property_id,
    property_service_id: null,
    title: title || null,
    description: description || null,
    service_date: service_date || null,
    status: service_date ? "scheduled" : "unscheduled",
    estimated_duration_min,
    actual_duration_min: null,
    price,
    photo_required,
  }

  const { error } = await db.from("jobs").insert(row)
  if (error) return { success: false, message: error.message }

  revalidatePath("/jobs")
  revalidatePath("/schedule")
  revalidatePath("/dashboard")
  revalidatePath(`/clients/${client_id}`)
  return { success: true, message: "One-off job created." }
}

export async function updateJobSchedule(
  jobId: string,
  serviceDate: string | null,
): Promise<JobActionState> {
  const parsed = JobScheduleSchema.safeParse({ jobId, serviceDate })
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, client_id")
    .eq("id", jobId)
    .eq("business_id", businessId)
    .single()

  if (jobError || !job) {
    return { success: false, message: jobError?.message ?? "Job not found." }
  }

  const { error } = await db
    .from("jobs")
    .update({
      service_date: serviceDate,
      status: serviceDate ? "scheduled" : "unscheduled",
    })
    .eq("id", jobId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/jobs")
  revalidatePath("/schedule")
  revalidatePath("/dashboard")
  revalidatePath(`/clients/${job.client_id}`)
  return { success: true, message: "Job schedule updated." }
}

export async function rescheduleJobsForDate(
  fromDate: string,
  toDate: string,
): Promise<JobActionState & { movedCount?: number }> {
  const parsed = RescheduleDateSchema.safeParse({ fromDate, toDate })
  if (!parsed.success) {
    return { success: false, message: "Invalid dates." }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Only move scheduled jobs not already on a route
  const { data: jobs, error: fetchError } = await db
    .from("jobs")
    .select("id, route_stops(id)")
    .eq("business_id", businessId)
    .eq("service_date", parsed.data.fromDate)
    .eq("status", "scheduled")

  if (fetchError) return { success: false, message: fetchError.message }

  const movableIds = ((jobs ?? []) as { id: string; route_stops: { id: string }[] }[])
    .filter((j) => (j.route_stops?.length ?? 0) === 0)
    .map((j) => j.id)

  if (movableIds.length === 0) {
    return { success: false, message: "No movable jobs on that date (routed jobs must be moved manually)." }
  }

  const { error: updateError } = await db
    .from("jobs")
    .update({ service_date: parsed.data.toDate })
    .in("id", movableIds)

  if (updateError) return { success: false, message: updateError.message }

  revalidatePath("/schedule")
  revalidatePath("/dashboard")
  revalidatePath("/jobs")
  return {
    success: true,
    message: `${movableIds.length} job${movableIds.length !== 1 ? "s" : ""} moved to ${parsed.data.toDate}.`,
    movedCount: movableIds.length,
  }
}
