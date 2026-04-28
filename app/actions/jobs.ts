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

const JobScheduleSchema = z.object({
  jobId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
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
  const { client_id, property_id, service_date, estimated_duration_min, price, photo_required } = parsed.data

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
