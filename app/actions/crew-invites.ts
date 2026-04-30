"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import type { ActionState } from "./auth"
import type { UserRole } from "@/types"

const InviteSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  firstName: z.string().min(1, { message: "First name is required." }).trim(),
  lastName: z.string().min(1, { message: "Last name is required." }).trim(),
  role: z.enum(["manager", "crew_lead", "crew_member"]).refine(Boolean, { message: "Select a role." }),
})

export async function inviteCrewMember(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    email: formData.get("email") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    role: formData.get("role") as string,
  }

  const parsed = InviteSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Validation error.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      fields: { email: raw.email, firstName: raw.firstName, lastName: raw.lastName, role: raw.role },
    }
  }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      business_id: businessId,
      role: parsed.data.role as UserRole,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
    },
    redirectTo: `${appUrl}/auth/confirm?next=/crew-setup`,
  })

  if (error) {
    // Supabase returns a 422 if the user already exists
    if (error.message.toLowerCase().includes("already been registered")) {
      return { success: false, message: "An account with that email already exists." }
    }
    return { success: false, message: error.message }
  }

  return {
    success: true,
    message: `Invite sent to ${parsed.data.email}. They'll receive an email to set up their account.`,
  }
}
