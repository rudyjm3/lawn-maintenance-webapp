"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { getNextEstimateNumber } from "@/lib/billing/estimate-numbers"
import { roundCents } from "@/lib/billing/tax"
import { z } from "zod"
import { type EstimateStatus } from "@/types"

export type EstimateActionState =
  | { success: true; message: string; id?: string }
  | { success: false; message: string }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  id: z.string().optional(),
  service_type_id: z.string().nullable().optional(),
  description: z.string().min(1, "Description is required"),
  qty: z.coerce.number().min(0.01, "Qty must be > 0"),
  unit_price: z.coerce.number().min(0, "Price must be 0 or more"),
  duration_min: z.coerce.number().int().nullable().optional(),
})

const EstimateSchema = z.object({
  id: z.string().optional(),
  client_id: z.string().min(1, "Client is required"),
  valid_until: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().nullable().optional(),
  items: z.array(LineItemSchema).min(1, "At least one line item is required"),
})

export type EstimateFormValues = z.infer<typeof EstimateSchema>

// ─── Save estimate (create or update) ───────────────────────────────────────

export async function saveEstimate(values: EstimateFormValues): Promise<EstimateActionState> {
  const parsed = EstimateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, client_id, valid_until, tax_rate, notes, items } = parsed.data

  // Calculate totals
  const subtotal = roundCents(items.reduce((sum, item) => sum + item.qty * item.unit_price, 0))
  const tax = roundCents(subtotal * (tax_rate / 100))
  const total = roundCents(subtotal + tax)

  if (id) {
    // Update existing estimate
    const { error } = await db
      .from("estimates")
      .update({ client_id, valid_until: valid_until ?? null, subtotal, tax, total, notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", businessId)

    if (error) return { success: false, message: error.message }

    // Replace all items
    await db.from("estimate_items").delete().eq("estimate_id", id).eq("business_id", businessId)

    const itemRows = items.map((item) => ({
      business_id: businessId,
      estimate_id: id,
      service_type_id: item.service_type_id ?? null,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      total_price: roundCents(item.qty * item.unit_price),
      duration_min: item.duration_min ?? null,
    }))
    const { error: itemsError } = await db.from("estimate_items").insert(itemRows)
    if (itemsError) return { success: false, message: itemsError.message }

    revalidatePath("/estimates")
    revalidatePath(`/estimates/${id}`)
    return { success: true, message: "Estimate updated.", id }
  }

  // Create new estimate
  const estimate_number = await getNextEstimateNumber(db, businessId)

  const estimateRow: Record<string, unknown> = {
    business_id: businessId,
    client_id,
    estimate_number,
    status: "draft",
    subtotal,
    tax,
    total,
    valid_until: valid_until ?? null,
    notes: notes ?? null,
  }

  let { data: est, error: estError } = await db
    .from("estimates")
    .insert(estimateRow)
    .select("id")
    .single()

  // Fallback: notes column may not exist if migration 005 hasn't been applied yet
  if (estError?.message?.includes("notes")) {
    const { notes: _n, ...rowWithoutNotes } = estimateRow
    void _n
    ;({ data: est, error: estError } = await db
      .from("estimates")
      .insert(rowWithoutNotes)
      .select("id")
      .single())
  }

  if (estError) return { success: false, message: estError.message }

  const itemRows = items.map((item) => ({
    business_id: businessId,
    estimate_id: est.id,
    service_type_id: item.service_type_id ?? null,
    description: item.description,
    qty: item.qty,
    unit_price: item.unit_price,
    total_price: roundCents(item.qty * item.unit_price),
    duration_min: item.duration_min ?? null,
  }))

  const { error: itemsError } = await db.from("estimate_items").insert(itemRows)
  if (itemsError) return { success: false, message: itemsError.message }

  revalidatePath("/estimates")
  return { success: true, message: "Estimate created.", id: est.id }
}

// ─── Update estimate status ──────────────────────────────────────────────────

export async function updateEstimateStatus(
  estimateId: string,
  status: EstimateStatus,
): Promise<EstimateActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("estimates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", estimateId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/estimates")
  revalidatePath(`/estimates/${estimateId}`)
  return { success: true, message: `Estimate marked as ${status}.` }
}

// ─── Delete estimate ─────────────────────────────────────────────────────────

export async function deleteEstimate(estimateId: string): Promise<EstimateActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("estimates")
    .delete()
    .eq("id", estimateId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/estimates")
  return { success: true, message: "Estimate deleted." }
}

// ─── Send estimate via email ─────────────────────────────────────────────────

export async function sendEstimate(estimateId: string): Promise<EstimateActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: estimate, error: estError } = await db
    .from("estimates")
    .select("*, client:clients(*), items:estimate_items(*)")
    .eq("id", estimateId)
    .eq("business_id", businessId)
    .single()

  if (estError || !estimate) return { success: false, message: "Estimate not found." }

  const { sendEstimateEmail } = await import("@/lib/email/send-estimate")
  const emailResult = await sendEstimateEmail(estimate)
  if (!emailResult.success) return { success: false, message: emailResult.message }

  // Update status to sent + log communication
  await db
    .from("estimates")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", estimateId)
    .eq("business_id", businessId)

  if (estimate.client_id) {
    await db.from("communications").insert({
      business_id: businessId,
      client_id: estimate.client_id,
      channel: "email",
      direction: "outbound",
      message: `Estimate ${estimate.estimate_number} sent ($${Number(estimate.total).toFixed(2)})`,
    })
  }

  revalidatePath("/estimates")
  revalidatePath(`/estimates/${estimateId}`)
  return { success: true, message: emailResult.message }
}

// ─── Convert approved estimate to recurring service plan ────────────────────

const ConvertSchema = z.object({
  estimate_id: z.string().min(1),
  property_id: z.string().min(1, "Property is required"),
  frequency_type: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  interval: z.coerce.number().int().min(1).default(1),
  day_of_week: z.coerce.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export type ConvertEstimateValues = z.infer<typeof ConvertSchema>

export async function convertEstimateToServicePlan(
  values: ConvertEstimateValues,
): Promise<EstimateActionState> {
  const parsed = ConvertSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { estimate_id, property_id, frequency_type, interval, day_of_week, start_date, end_date } = parsed.data

  // Fetch estimate + items
  const { data: estimate, error: estError } = await db
    .from("estimates")
    .select("*, items:estimate_items(*)")
    .eq("id", estimate_id)
    .eq("business_id", businessId)
    .single()

  if (estError || !estimate) return { success: false, message: "Estimate not found." }
  if (estimate.status !== "approved") return { success: false, message: "Only approved estimates can be converted." }

  // Create one property_service + recurrence_rule per line item that has a service_type_id
  const items = (estimate.items ?? []) as Array<{ service_type_id: string | null; unit_price: number; duration_min: number | null; description: string }>
  const serviceableItems = items.filter((i) => i.service_type_id)

  if (serviceableItems.length === 0) {
    return { success: false, message: "No line items have a linked service type. Assign service types to items before converting." }
  }

  for (const item of serviceableItems) {
    const { data: ps, error: psError } = await db
      .from("property_services")
      .insert({
        business_id: businessId,
        property_id,
        service_type_id: item.service_type_id,
        custom_price: item.unit_price,
        duration_min: item.duration_min ?? null,
        instructions: null,
        is_active: true,
        client_id: estimate.client_id,
      })
      .select("id")
      .single()

    if (psError) return { success: false, message: psError.message }

    const { error: rrError } = await db.from("recurrence_rules").insert({
      business_id: businessId,
      property_service_id: ps.id,
      frequency_type,
      interval,
      day_of_week: day_of_week ?? null,
      start_date,
      end_date: end_date ?? null,
      active_months: null,
    })

    if (rrError) return { success: false, message: rrError.message }
  }

  // Mark estimate as approved (already should be, but confirm)
  await db
    .from("estimates")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", estimate_id)
    .eq("business_id", businessId)

  revalidatePath("/estimates")
  revalidatePath(`/estimates/${estimate_id}`)
  revalidatePath("/schedules")

  return { success: true, message: `Service plan created from estimate — ${serviceableItems.length} service${serviceableItems.length !== 1 ? "s" : ""} scheduled.` }
}
