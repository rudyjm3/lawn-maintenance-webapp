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

// Pre-loaded service type templates seeded for every new tenant
const SERVICE_TEMPLATES = [
  { name: "Weekly Mow",      default_duration_min: 45,  default_price: 65,  is_recurring: true,  is_seasonal: true  },
  { name: "Biweekly Mow",   default_duration_min: 60,  default_price: 85,  is_recurring: true,  is_seasonal: true  },
  { name: "Hedge Trim",      default_duration_min: 90,  default_price: 120, is_recurring: false, is_seasonal: false },
  { name: "Leaf Cleanup",    default_duration_min: 120, default_price: 175, is_recurring: false, is_seasonal: true  },
  { name: "Fertilization",   default_duration_min: 30,  default_price: 95,  is_recurring: true,  is_seasonal: true  },
  { name: "Spring Cleanup",  default_duration_min: 180, default_price: 250, is_recurring: false, is_seasonal: true  },
  { name: "Fall Cleanup",    default_duration_min: 180, default_price: 250, is_recurring: false, is_seasonal: true  },
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 1. Create business row — pre-generate the UUID so we don't need
  // .select("id").single() whose RETURNING clause would be blocked by RLS
  // before the users row exists (auth_business_id() returns NULL at this point).
  const tenantId = crypto.randomUUID()
  const baseSlug = slugify(parsed.data.businessName)
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const { error: tenantError } = await db
    .from("businesses")
    .insert({
      id: tenantId,
      business_name: parsed.data.businessName,
      slug,
      timezone: parsed.data.timezone,
      phone: parsed.data.phone || null,
      email: user.email ?? null,
    })

  if (tenantError) {
    return { success: false, message: `Failed to create account: ${tenantError.message}` }
  }

  // 2. Create user profile row
  const { error: userError } = await db.from("users").insert({
    business_id: tenantId,
    auth_user_id: user.id,
    first_name: user.user_metadata?.first_name ?? "",
    last_name: user.user_metadata?.last_name ?? "",
    role: "owner",
    is_active: true,
  })

  if (userError) {
    return { success: false, message: `Failed to create user profile: ${userError.message}` }
  }

  // 3. Store business_id in auth user metadata so the JWT carries it for RLS
  await supabase.auth.updateUser({
    data: {
      business_id: tenantId,
      business_name: parsed.data.businessName,
      phone: parsed.data.phone,
      timezone: parsed.data.timezone,
      onboarding_complete: true,
    },
  })

  // 4. Seed default service types for this tenant
  const serviceRows = SERVICE_TEMPLATES.map((t) => ({ ...t, business_id: tenantId }))
  await db.from("service_types").insert(serviceRows)

  // 5. If a first client was provided, create them
  const firstName = parsed.data.clientFirstName?.trim()
  const lastName = parsed.data.clientLastName?.trim()
  const clientName = [firstName, lastName].filter(Boolean).join(" ")

  if (clientName) {
    await db.from("clients").insert({
      business_id: tenantId,
      name: clientName,
      email: parsed.data.clientEmail || null,
      phone: parsed.data.clientPhone || null,
      billing_address: parsed.data.clientAddress || null,
      status: "active",
      source: "walk-in",
    })
  }

  redirect("/dashboard")
}
