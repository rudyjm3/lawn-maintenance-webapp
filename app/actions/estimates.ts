"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { type EstimateStatus } from "@/types"

export type EstimateActionState =
  | { success: true; message: string; id?: string }
  | { success: false; message: string }

// ─── Schemas ──────────────────────────────────────────────────────────────────

const EstimateItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  qty: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unit_price: z.coerce.number().min(0, "Unit price must be 0 or more"),
  duration_min: z.coerce.number().int().min(0).optional(),
})

const EstimateSchema = z.object({
  id: z.string().optional(),
  client_id: z.string().min(1, "Client is required"),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  items: z.array(EstimateItemSchema).min(1, "At least one line item is required"),
})

export type EstimateFormValues = z.infer<typeof EstimateSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextEstimateNumber(db: ReturnType<typeof Object.create>, businessId: string) {
  const { data } = await db
    .from("estimates")
    .select("estimate_number")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (data?.estimate_number) {
    const match = (data.estimate_number as string).match(/(\d+)$/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  return `EST-${String(nextNum).padStart(4, "0")}`
}

// ─── Save (create or update) ─────────────────────────────────────────────────

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
  const { id, client_id, valid_until, tax_rate, items } = parsed.data

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
  const tax = Math.round(subtotal * (tax_rate / 100) * 100) / 100
  const total = subtotal + tax

  if (id) {
    // Update
    const { data: existing, error: fetchError } = await db
      .from("estimates")
      .select("id, business_id")
      .eq("id", id)
      .eq("business_id", businessId)
      .maybeSingle()

    if (fetchError || !existing) {
      return { success: false, message: "Estimate not found." }
    }

    const { error: updateError } = await db
      .from("estimates")
      .update({
        client_id,
        valid_until: valid_until || null,
        subtotal,
        tax,
        total,
      })
      .eq("id", id)

    if (updateError) return { success: false, message: updateError.message }

    // Replace line items
    await db.from("estimate_items").delete().eq("estimate_id", id)

    const itemRows = items.map((item) => ({
      business_id: businessId,
      estimate_id: id,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      total_price: Math.round(item.qty * item.unit_price * 100) / 100,
      duration_min: item.duration_min ?? null,
      service_type_id: null,
    }))

    const { error: itemsError } = await db.from("estimate_items").insert(itemRows)
    if (itemsError) return { success: false, message: itemsError.message }

    revalidatePath("/estimates")
    return { success: true, message: "Estimate updated.", id }
  }

  // Create
  const estimateNumber = await nextEstimateNumber(db, businessId)

  const { data: estimate, error: insertError } = await db
    .from("estimates")
    .insert({
      business_id: businessId,
      client_id,
      lead_id: null,
      estimate_number: estimateNumber,
      status: "draft",
      subtotal,
      tax,
      total,
      valid_until: valid_until || null,
    })
    .select("id")
    .single()

  if (insertError) return { success: false, message: insertError.message }

  const itemRows = items.map((item) => ({
    business_id: businessId,
    estimate_id: estimate.id,
    description: item.description,
    qty: item.qty,
    unit_price: item.unit_price,
    total_price: Math.round(item.qty * item.unit_price * 100) / 100,
    duration_min: item.duration_min ?? null,
    service_type_id: null,
  }))

  const { error: itemsError } = await db.from("estimate_items").insert(itemRows)
  if (itemsError) {
    await db.from("estimates").delete().eq("id", estimate.id)
    return { success: false, message: itemsError.message }
  }

  revalidatePath("/estimates")
  return { success: true, message: "Estimate created.", id: estimate.id }
}

// ─── Update status ────────────────────────────────────────────────────────────

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
    .update({ status })
    .eq("id", estimateId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/estimates")
  return { success: true, message: `Estimate marked as ${status}.` }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteEstimate(estimateId: string): Promise<EstimateActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: estimate, error: fetchError } = await db
    .from("estimates")
    .select("status")
    .eq("id", estimateId)
    .eq("business_id", businessId)
    .maybeSingle()

  if (fetchError || !estimate) return { success: false, message: "Estimate not found." }
  if (estimate.status !== "draft") {
    return { success: false, message: "Only draft estimates can be deleted." }
  }

  const { error } = await db
    .from("estimates")
    .delete()
    .eq("id", estimateId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/estimates")
  return { success: true, message: "Estimate deleted." }
}
