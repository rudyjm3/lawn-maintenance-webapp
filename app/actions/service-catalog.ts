"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

export type ServiceCatalogActionState =
  | { success: true; message: string }
  | { success: false; message: string }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ServiceTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  default_duration_min: z.coerce.number().int().min(1, "Duration must be at least 1 minute"),
  default_price: z.coerce.number().min(0, "Price must be 0 or more"),
  is_recurring: z.boolean().default(false),
  is_seasonal: z.boolean().default(false),
})

const PropertyServiceSchema = z.object({
  id: z.string().optional(),
  property_id: z.string().min(1, "Property is required"),
  service_type_id: z.string().min(1, "Service type is required"),
  custom_price: z.coerce.number().min(0).nullable().optional(),
  duration_min: z.coerce.number().int().min(1).nullable().optional(),
  instructions: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  client_id: z.string().min(1, "Client ID is required"),
})

const RecurrenceRuleSchema = z
  .object({
    id: z.string().optional(),
    property_service_id: z.string().min(1),
    frequency_type: z.enum(["weekly", "biweekly", "monthly", "custom"]),
    interval: z.coerce.number().int().min(1).default(1),
    day_of_week: z.coerce.number().int().min(0).max(6).nullable().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    active_months: z.array(z.number().int().min(1).max(12)).nullable().optional(),
    client_id: z.string().min(1),
  })
  .refine((d) => d.frequency_type !== "custom" || d.interval > 1, {
    message: "Custom frequency requires interval > 1",
    path: ["interval"],
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  })

const ScheduleExceptionSchema = z
  .object({
    id: z.string().optional(),
    recurrence_rule_id: z.string().min(1),
    original_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    exception_type: z.enum(["skip", "reschedule", "cancel"]),
    new_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    reason: z.string().nullable().optional(),
    client_id: z.string().min(1),
  })
  .refine((d) => d.exception_type !== "reschedule" || !!d.new_date, {
    message: "New date is required for reschedule",
    path: ["new_date"],
  })

export type ServiceTypeFormValues = z.infer<typeof ServiceTypeSchema>
export type PropertyServiceFormValues = z.infer<typeof PropertyServiceSchema>
export type RecurrenceRuleFormValues = z.infer<typeof RecurrenceRuleSchema>
export type ScheduleExceptionFormValues = z.infer<typeof ScheduleExceptionSchema>

// ─── Service type actions ─────────────────────────────────────────────────────

export async function saveServiceType(
  values: ServiceTypeFormValues
): Promise<ServiceCatalogActionState> {
  const parsed = ServiceTypeSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, ...fields } = parsed.data
  const row = {
    name: fields.name,
    default_duration_min: fields.default_duration_min,
    default_price: fields.default_price,
    is_recurring: fields.is_recurring,
    is_seasonal: fields.is_seasonal,
  }

  if (id) {
    const { error } = await db.from("service_types").update(row).eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/service-catalog")
    return { success: true, message: `${row.name} updated.` }
  }

  const { error } = await db.from("service_types").insert(row)
  if (error) return { success: false, message: error.message }
  revalidatePath("/service-catalog")
  return { success: true, message: `${row.name} added.` }
}

export async function deleteServiceType(id: string): Promise<ServiceCatalogActionState> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: usages } = await db
    .from("property_services")
    .select("id")
    .eq("service_type_id", id)
    .limit(1)

  if (usages && usages.length > 0) {
    return {
      success: false,
      message: "Cannot delete — this service is assigned to one or more properties. Remove all assignments first.",
    }
  }

  const { error } = await db.from("service_types").delete().eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath("/service-catalog")
  return { success: true, message: "Service deleted." }
}

// ─── Property service actions ─────────────────────────────────────────────────

export async function savePropertyService(
  values: PropertyServiceFormValues
): Promise<ServiceCatalogActionState> {
  const parsed = PropertyServiceSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, client_id, ...fields } = parsed.data
  const row = {
    property_id: fields.property_id,
    service_type_id: fields.service_type_id,
    custom_price: fields.custom_price ?? null,
    duration_min: fields.duration_min ?? null,
    instructions: fields.instructions?.trim() || null,
    is_active: fields.is_active,
  }

  if (id) {
    const { error } = await db.from("property_services").update(row).eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath(`/clients/${client_id}`)
    return { success: true, message: "Service assignment updated." }
  }

  const { error } = await db.from("property_services").insert(row)
  if (error) return { success: false, message: error.message }
  revalidatePath(`/clients/${client_id}`)
  return { success: true, message: "Service assigned to property." }
}

export async function deletePropertyService(
  id: string,
  clientId: string
): Promise<ServiceCatalogActionState> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from("property_services").delete().eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath(`/clients/${clientId}`)
  return { success: true, message: "Service removed from property." }
}

// ─── Recurrence rule actions ──────────────────────────────────────────────────

export async function saveRecurrenceRule(
  values: RecurrenceRuleFormValues
): Promise<ServiceCatalogActionState> {
  const parsed = RecurrenceRuleSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, client_id, ...fields } = parsed.data
  const row = {
    property_service_id: fields.property_service_id,
    frequency_type: fields.frequency_type,
    interval: fields.interval,
    day_of_week: fields.day_of_week ?? null,
    start_date: fields.start_date,
    end_date: fields.end_date ?? null,
    active_months: fields.active_months && fields.active_months.length > 0 ? fields.active_months : null,
  }

  if (id) {
    const { error } = await db.from("recurrence_rules").update(row).eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath(`/clients/${client_id}`)
    return { success: true, message: "Schedule updated." }
  }

  const { error } = await db.from("recurrence_rules").insert(row)
  if (error) return { success: false, message: error.message }
  revalidatePath(`/clients/${client_id}`)
  return { success: true, message: "Schedule saved." }
}

// ─── Schedule exception actions ───────────────────────────────────────────────

export async function saveScheduleException(
  values: ScheduleExceptionFormValues
): Promise<ServiceCatalogActionState> {
  const parsed = ScheduleExceptionSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, client_id, ...fields } = parsed.data
  const row = {
    recurrence_rule_id: fields.recurrence_rule_id,
    original_date: fields.original_date,
    exception_type: fields.exception_type,
    new_date: fields.new_date ?? null,
    reason: fields.reason?.trim() || null,
  }

  if (id) {
    const { error } = await db.from("schedule_exceptions").update(row).eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath(`/clients/${client_id}`)
    return { success: true, message: "Exception updated." }
  }

  const { error } = await db.from("schedule_exceptions").insert(row)
  if (error) return { success: false, message: error.message }
  revalidatePath(`/clients/${client_id}`)
  return { success: true, message: "Exception saved." }
}

export async function deleteScheduleException(
  id: string,
  clientId: string
): Promise<ServiceCatalogActionState> {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from("schedule_exceptions").delete().eq("id", id)
  if (error) return { success: false, message: error.message }
  revalidatePath(`/clients/${clientId}`)
  return { success: true, message: "Exception removed." }
}
