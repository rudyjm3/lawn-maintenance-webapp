"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"

export type ZoneActionState =
  | { success: true; message: string }
  | { success: false; message: string }

const CoordPair = z.tuple([z.number(), z.number()])

const ZoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  description: z.string().optional().nullable(),
  polygon_geojson: z.array(CoordPair).optional().nullable(),
})

const ZoneUpdateSchema = ZoneSchema.extend({
  id: z.string().uuid(),
})

export async function createZone(
  values: z.infer<typeof ZoneSchema>,
): Promise<ZoneActionState> {
  const parsed = ZoneSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from("service_zones").insert({
    business_id: businessId,
    name: parsed.data.name,
    color: parsed.data.color,
    description: parsed.data.description ?? null,
    polygon_geojson: parsed.data.polygon_geojson ?? null,
  })

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  return { success: true, message: "Zone created." }
}

export async function updateZone(
  values: z.infer<typeof ZoneUpdateSchema>,
): Promise<ZoneActionState> {
  const parsed = ZoneUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("service_zones")
    .update({
      name: parsed.data.name,
      color: parsed.data.color,
      description: parsed.data.description ?? null,
      polygon_geojson: parsed.data.polygon_geojson ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  return { success: true, message: "Zone updated." }
}

export async function deleteZone(id: string): Promise<ZoneActionState> {
  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("service_zones")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/zones")
  return { success: true, message: "Zone deleted." }
}
