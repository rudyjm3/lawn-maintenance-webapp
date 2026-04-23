"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import type { ActionState } from "./auth"

// ─── Schema ───────────────────────────────────────────────────────────────────

const OnboardingSchema = z.object({
  // Step 1 — Business profile
  businessName: z.string().min(2).trim(),
  phone: z.string().trim().optional(),
  timezone: z.string().min(1, { message: "Select a timezone." }),
  serviceRadius: z.string().optional(),

  // Step 2 — Services (comma-separated service names)
  services: z.string().optional(),

  // Step 3 — Working hours
  workdayStart: z.string().default("07:00"),
  workdayEnd: z.string().default("17:00"),
  workDays: z.string().default("Mon,Tue,Wed,Thu,Fri"),

  // Step 4 — First client
  clientFirstName: z.string().trim().optional(),
  clientLastName: z.string().trim().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().trim().optional(),
  clientAddress: z.string().trim().optional(),
})

// ─── Action ───────────────────────────────────────────────────────────────────

export async function completeOnboarding(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries())
  const parsed = OnboardingSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      success: false,
      message: "Please fill in all required fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "Not authenticated." }
  }

  // Update user metadata with business profile
  const { error } = await supabase.auth.updateUser({
    data: {
      business_name: parsed.data.businessName,
      phone: parsed.data.phone,
      timezone: parsed.data.timezone,
      onboarding_complete: true,
    },
  })

  if (error) {
    return { success: false, message: error.message }
  }

  // TODO (Sprint 2): insert tenant row, service_types, and first client
  // into the database once the schema is applied via Supabase migrations.

  redirect("/dashboard")
}
