"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"
import { type PricingSettings, DEFAULT_PRICING_SETTINGS, type BusinessLocation, type WorkScheduleSettings, DEFAULT_WORK_SCHEDULE } from "@/types"
import { geocodeAddress } from "@/app/actions/properties"

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

// ─── Business location ────────────────────────────────────────────────────────

const BusinessLocationSchema = z.object({
  operating_location: z.string().min(1, "Enter a city or area").max(200),
})

export type BusinessLocationActionState =
  | { success: true; message: string; geocoded: boolean }
  | { success: false; message: string }

const EMPTY_LOCATION: BusinessLocation = {
  operating_location: null,
  operating_lat: null,
  operating_lng: null,
}

export async function getBusinessLocation(): Promise<BusinessLocation> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return EMPTY_LOCATION

  const { data } = await db
    .from("businesses")
    .select("operating_location, operating_lat, operating_lng")
    .eq("id", businessId)
    .single()

  return data ?? EMPTY_LOCATION
}

export async function saveBusinessLocation(
  values: { operating_location: string },
): Promise<BusinessLocationActionState> {
  const parsed = BusinessLocationSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const location = parsed.data.operating_location.trim()
  const geo = await geocodeAddress(location)

  const payload = geo.coordinates
    ? { operating_location: location, operating_lat: geo.coordinates.lat, operating_lng: geo.coordinates.lng }
    : { operating_location: location, operating_lat: null, operating_lng: null }

  const { error } = await db.from("businesses").update(payload).eq("id", businessId)
  if (error) return { success: false, message: error.message }

  revalidatePath("/settings")
  revalidatePath("/zones")

  if (!geo.coordinates) {
    return {
      success: true,
      message: `Location saved, but "${location}" could not be geocoded. Maps will use the US-center fallback until geocoding succeeds.`,
      geocoded: false,
    }
  }
  return { success: true, message: "Operating location saved.", geocoded: true }
}

// ─── Work schedule settings ───────────────────────────────────────────────────

const WorkScheduleSchema = z.object({
  schedule_start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  schedule_end_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  schedule_lunch_start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  schedule_lunch_duration_min: z.coerce.number().int().min(0).max(180),
})

export async function getWorkScheduleSettings(): Promise<WorkScheduleSettings> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return DEFAULT_WORK_SCHEDULE

  const { data } = await db
    .from("businesses")
    .select("schedule_start_time, schedule_end_time, schedule_lunch_start_time, schedule_lunch_duration_min")
    .eq("id", businessId)
    .single()

  return data ?? DEFAULT_WORK_SCHEDULE
}

export async function saveWorkScheduleSettings(
  values: WorkScheduleSettings,
): Promise<{ success: boolean; message: string }> {
  const parsed = WorkScheduleSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }
  if (parsed.data.schedule_start_time >= parsed.data.schedule_end_time) {
    return { success: false, message: "End time must be after start time." }
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
  return { success: true, message: "Work schedule saved." }
}

// ─── Pricing settings ─────────────────────────────────────────────────────────

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
