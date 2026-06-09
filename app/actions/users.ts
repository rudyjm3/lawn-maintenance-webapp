"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"

export type UserActionState =
  | { success: true; message: string }
  | { success: false; message: string }

const SaveUserSchema = z.object({
  id:         z.string(),
  first_name: z.string().min(1, "First name is required"),
  last_name:  z.string().min(1, "Last name is required"),
  role:       z.enum(["owner", "manager", "crew_lead", "crew_member"]),
  is_active:  z.boolean(),
  email:      z.string().email("Enter a valid email address.").optional(),
})

export type SaveUserValues = z.infer<typeof SaveUserSchema>

export async function saveUser(values: SaveUserValues): Promise<UserActionState> {
  const parsed = SaveUserSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, email, ...fields } = parsed.data

  const { error } = await db
    .from("users")
    .update({
      first_name: fields.first_name.trim(),
      last_name:  fields.last_name.trim(),
      role:       fields.role,
      is_active:  fields.is_active,
    })
    .eq("id", id)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  // Update email in auth.users if a new one was provided.
  // Fetch auth_user_id from the authorized DB row — never trust client input for this.
  if (email) {
    const { data: userData, error: fetchError } = await db
      .from("users")
      .select("auth_user_id")
      .eq("id", id)
      .eq("business_id", businessId)
      .single()

    if (fetchError || !userData?.auth_user_id) {
      return { success: false, message: "Profile saved but could not resolve account for email update." }
    }

    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.updateUserById(userData.auth_user_id, { email })
    if (authError) return { success: false, message: `Profile saved but email update failed: ${authError.message}` }
  }

  revalidatePath("/crews")
  return { success: true, message: "Member updated." }
}

export async function removeFromCrew(userId: string, crewId: string): Promise<UserActionState> {
  if (!userId || !crewId) return { success: false, message: "Invalid parameters." }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from("crew_members")
    .delete()
    .eq("user_id", userId)
    .eq("crew_id", crewId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/crews")
  return { success: true, message: "Removed from crew." }
}

export async function addToCrew(
  userId: string,
  crewId: string,
  isLead: boolean,
): Promise<UserActionState> {
  if (!userId || !crewId) return { success: false, message: "Invalid parameters." }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from("crew_members").insert({
    user_id:     userId,
    crew_id:     crewId,
    is_lead:     isLead,
    business_id: businessId,
  })

  if (error) {
    if (error.code === "23505") return { success: false, message: "Member is already in that crew." }
    return { success: false, message: error.message }
  }

  revalidatePath("/crews")
  return { success: true, message: "Added to crew." }
}
