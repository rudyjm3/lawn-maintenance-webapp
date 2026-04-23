"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { z } from "zod"

export type PropertyActionState =
  | { success: true; message: string }
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Not authenticated." }

  const { id, ...fields } = parsed.data
  const geo = await geocodeAddress(fields.address)

  const row = {
    client_id: fields.client_id,
    address: fields.address.trim(),
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    lawn_size: fields.lawn_size?.trim() || null,
    gate_code: fields.gate_code?.trim() || null,
    access_notes: fields.access_notes?.trim() || null,
    pet_notes: fields.pet_notes?.trim() || null,
    is_commercial: fields.is_commercial,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (id) {
    const { error } = await db.from("properties").update(row).eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/properties")
    revalidatePath(`/clients/${fields.client_id}`)
    return { success: true, message: "Property updated." }
  }

  const { error } = await db.from("properties").insert(row)
  if (error) return { success: false, message: error.message }
  revalidatePath("/properties")
  revalidatePath(`/clients/${fields.client_id}`)
  return { success: true, message: "Property added." }
}
