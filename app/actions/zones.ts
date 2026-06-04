"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"

export type ZoneActionState =
  | { success: true; message: string; id?: string }
  | { success: false; message: string }

// ─── Create zone ──────────────────────────────────────────────────────────────

export async function createZone(data: {
  name: string
  color: string
  description?: string | null
  coordinates?: [number, number][] | null
}): Promise<ZoneActionState> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const { data: row, error } = await db
    .from("service_zones")
    .insert({
      business_id: businessId,
      name: data.name.trim(),
      color: data.color,
      description: data.description ?? null,
      coordinates: data.coordinates ?? null,
    })
    .select("id")
    .single()

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  return { success: true, message: "Zone created.", id: row.id }
}

// ─── Update zone ──────────────────────────────────────────────────────────────

export async function updateZone(
  id: string,
  data: {
    name?: string
    color?: string
    description?: string | null
    coordinates?: [number, number][] | null
  },
): Promise<ZoneActionState> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.color !== undefined) payload.color = data.color
  if ("description" in data) payload.description = data.description ?? null
  if ("coordinates" in data) payload.coordinates = data.coordinates ?? null

  const { error } = await db
    .from("service_zones")
    .update(payload)
    .eq("id", id)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  return { success: true, message: "Zone updated." }
}

// ─── Delete zone ──────────────────────────────────────────────────────────────

export async function deleteZone(id: string): Promise<ZoneActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const { error } = await supabase
    .from("service_zones")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  revalidatePath("/properties")
  return { success: true, message: "Zone deleted." }
}

// ─── Assign property to zone ──────────────────────────────────────────────────

export async function assignPropertyZone(
  propertyId: string,
  zoneId: string | null,
): Promise<ZoneActionState> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const { error } = await db
    .from("properties")
    .update({ zone_id: zoneId })
    .eq("id", propertyId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  revalidatePath("/properties")
  return { success: true, message: zoneId ? "Property assigned to zone." : "Zone assignment cleared." }
}
