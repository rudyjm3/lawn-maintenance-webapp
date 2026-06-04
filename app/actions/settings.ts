"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"
import { type PricingSettings, DEFAULT_PRICING_SETTINGS } from "@/types"

const PricingSettingsSchema = z.object({
  pricing_sqft_per_min: z.coerce.number().min(1, "Must be at least 1"),
  pricing_complexity_easy_mult: z.coerce.number().min(0.1).max(5),
  pricing_complexity_normal_mult: z.coerce.number().min(0.1).max(5),
  pricing_complexity_difficult_mult: z.coerce.number().min(0.1).max(5),
  pricing_edge_add_min: z.coerce.number().int().min(0).max(120),
  pricing_blow_add_min: z.coerce.number().int().min(0).max(120),
  pricing_default_crew_rate: z.coerce.number().min(1, "Must be at least $1"),
  pricing_range_pct: z.coerce.number().int().min(0).max(50),
})

export type PricingSettingsActionState =
  | { success: true; message: string }
  | { success: false; message: string }

export async function savePricingSettings(
  values: PricingSettings,
): Promise<PricingSettingsActionState> {
  const parsed = PricingSettingsSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const { error } = await db
    .from("businesses")
    .update(parsed.data)
    .eq("id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/settings")
  return { success: true, message: "Pricing settings saved." }
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return DEFAULT_PRICING_SETTINGS

  const { data } = await db
    .from("businesses")
    .select(
      "pricing_sqft_per_min, pricing_complexity_easy_mult, pricing_complexity_normal_mult, pricing_complexity_difficult_mult, pricing_edge_add_min, pricing_blow_add_min, pricing_default_crew_rate, pricing_range_pct",
    )
    .eq("id", businessId)
    .single()

  return data ?? DEFAULT_PRICING_SETTINGS
}
