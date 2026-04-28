"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"
import { type LeadStatus } from "@/types"

export type LeadActionState =
  | { success: true; message: string }
  | { success: false; message: string }

// ─── Public quote submission (no auth required) ─────────────────────────────

const QuoteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  service_address: z.string().min(1, "Service address is required"),
  requested_services: z.array(z.string()),
  notes: z.string().optional(),
})

export type QuoteFormValues = z.infer<typeof QuoteSchema>

export async function submitQuote(values: QuoteFormValues): Promise<LeadActionState> {
  const parsed = QuoteSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const businessId = process.env.SITE_BUSINESS_ID
  if (!businessId) {
    return { success: false, message: "Quote submissions are not configured yet. Please call us directly." }
  }

  const db = createAdminClient() as any

  const row = {
    business_id: businessId,
    name: parsed.data.name,
    email: parsed.data.email?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    service_address: parsed.data.service_address,
    requested_services: parsed.data.requested_services,
    notes: parsed.data.notes?.trim() || null,
    status: "new" as const,
    source: "website",
  }

  const { error } = await db.from("leads").insert(row)
  if (error) return { success: false, message: "Something went wrong. Please try again." }

  return { success: true, message: "Quote request submitted!" }
}

// ─── Admin: update lead status ───────────────────────────────────────────────

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<LeadActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const db = supabase as any
  const { error } = await db
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/leads")
  return { success: true, message: "Lead status updated." }
}

// ─── Admin: convert lead to client ──────────────────────────────────────────

export async function convertLeadToClient(leadId: string): Promise<LeadActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  const db = supabase as any

  // Fetch lead
  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("business_id", businessId)
    .single()

  if (leadError || !lead) return { success: false, message: "Lead not found." }

  // Create client
  const { data: client, error: clientError } = await db
    .from("clients")
    .insert({
      business_id: businessId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: "active",
      source: lead.source ?? "website",
      notes: lead.notes ?? null,
    })
    .select("id")
    .single()

  if (clientError) return { success: false, message: clientError.message }

  // Create property from service address if present
  if (lead.service_address) {
    await db.from("properties").insert({
      business_id: businessId,
      client_id: client.id,
      address: lead.service_address,
    })
  }

  // Mark lead as won
  await db
    .from("leads")
    .update({ status: "won" })
    .eq("id", leadId)

  revalidatePath("/leads")
  revalidatePath("/clients")

  return { success: true, message: `${lead.name} converted to client.` }
}
