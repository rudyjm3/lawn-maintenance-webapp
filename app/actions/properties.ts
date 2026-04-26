"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"

export type PropertyActionState =
  | { success: true; message: string; geocoded: boolean }
  | { success: false; message: string }

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key || key.startsWith("your-")) return null

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`,
      { next: { revalidate: 86400 } }, // cache geocoded addresses for 24h
    )
    const json = await res.json()
    if (json.status !== "OK" || !json.results?.[0]) return null
    const { lat, lng } = json.results[0].geometry.location as { lat: number; lng: number }
    return { lat, lng }
  } catch {
    return null
  }
}

const PropertySchema = z.object({
  id: z.string().optional(),
  client_id: z.string().min(1, "Client is required"),
  address: z.string().min(1, "Address is required"),
  lawn_size: z.string().optional(),
  gate_code: z.string().optional(),
  access_notes: z.string().optional(),
  pet_notes: z.string().optional(),
  is_commercial: z.boolean().default(false),
})

export type PropertyFormValues = z.infer<typeof PropertySchema>

export async function saveProperty(values: PropertyFormValues): Promise<PropertyActionState> {
  const parsed = PropertySchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  const { id, ...fields } = parsed.data
  const address = fields.address.trim()
  const existingProperty = id
    ? await supabase
        .from("properties")
        .select("address, lat, lng")
        .eq("id", id)
        .eq("business_id", businessId)
        .single()
    : null
  const existingAddress = existingProperty?.data?.address
  const addressChanged = !id || existingAddress !== address
  const geo = addressChanged ? await geocodeAddress(address) : null

  const row = {
    client_id: fields.client_id,
    address,
    lawn_size: fields.lawn_size?.trim() || null,
    gate_code: fields.gate_code?.trim() || null,
    access_notes: fields.access_notes?.trim() || null,
    pet_notes: fields.pet_notes?.trim() || null,
    is_commercial: fields.is_commercial,
  }
  const coordinateFields = geo
    ? { lat: geo.lat, lng: geo.lng }
    : id
      ? {}
      : { lat: null, lng: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (id) {
    const { error } = await db
      .from("properties")
      .update({ ...row, ...coordinateFields })
      .eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/properties")
    revalidatePath(`/clients/${fields.client_id}`)
    const message = geo
      ? "Property updated and coordinates refreshed."
      : addressChanged
        ? "Property updated. Existing coordinates were preserved because geocoding did not return a result."
        : "Property updated."
    return { success: true, message, geocoded: !!geo }
  }

  const insertRow = { ...row, ...coordinateFields, business_id: businessId }
  const { error } = await db.from("properties").insert(insertRow)
  if (error) return { success: false, message: error.message }
  revalidatePath("/properties")
  revalidatePath(`/clients/${fields.client_id}`)
  return {
    success: true,
    message: geo
      ? "Property added and geocoded."
      : "Property added, but geocoding did not return coordinates.",
    geocoded: !!geo,
  }
}
