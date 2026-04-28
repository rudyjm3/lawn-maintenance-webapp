"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"

export type CrewActionState =
  | { success: true; message: string; crewId?: string }
  | { success: false; message: string }

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CrewSchema = z.object({
  id:          z.string().optional(),
  name:        z.string().min(1, "Crew name is required"),
  description: z.string().optional(),
  is_active:   z.boolean().default(true),
})

const MembersSchema = z.object({
  crewId:  z.string(),
  members: z.array(
    z.object({
      userId: z.string(),
      isLead: z.boolean(),
    }),
  ),
})

export type CrewFormValues   = z.infer<typeof CrewSchema>
export type MembersFormValues = z.infer<typeof MembersSchema>

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function saveCrew(values: CrewFormValues): Promise<CrewActionState> {
  const parsed = CrewSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, ...fields } = parsed.data
  const row = {
    name:        fields.name.trim(),
    description: fields.description?.trim() || null,
    is_active:   fields.is_active,
    business_id: businessId,
  }

  if (id) {
    const { error } = await db.from("crews").update(row).eq("id", id).eq("business_id", businessId)
    if (error) return { success: false, message: error.message }
    revalidatePath("/dashboard/crews")
    return { success: true, message: "Crew updated.", crewId: id }
  }

  const { data, error } = await db.from("crews").insert(row).select("id").single()
  if (error) return { success: false, message: error.message }
  revalidatePath("/dashboard/crews")
  return { success: true, message: "Crew created.", crewId: data.id }
}

export async function saveCrewMembers(values: MembersFormValues): Promise<CrewActionState> {
  const parsed = MembersSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { crewId, members } = parsed.data

  // Replace all members for this crew
  const { error: deleteError } = await db
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("business_id", businessId)

  if (deleteError) return { success: false, message: deleteError.message }

  if (members.length > 0) {
    const rows = members.map((m) => ({
      crew_id:     crewId,
      user_id:     m.userId,
      is_lead:     m.isLead,
      business_id: businessId,
    }))
    const { error: insertError } = await db.from("crew_members").insert(rows)
    if (insertError) return { success: false, message: insertError.message }
  }

  revalidatePath("/dashboard/crews")
  return { success: true, message: "Members saved." }
}
