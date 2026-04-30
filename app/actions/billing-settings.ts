"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { ensureStripeCustomer } from "@/lib/stripe/customers"
import { stripe } from "@/lib/stripe/client"
import { revalidatePath } from "next/cache"

export type BillingSettingsActionState =
  | { success: true; message: string; setupUrl?: string }
  | { success: false; message: string }

export async function setClientAutopayEnabled(input: {
  clientId: string
  enabled: boolean
}): Promise<BillingSettingsActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from("client_billing_settings").upsert(
    {
      business_id: businessId,
      client_id: input.clientId,
      autopay_enabled: input.enabled,
      autopay_mode: "invoice_due_date",
    },
    { onConflict: "business_id,client_id" },
  )

  if (error) return { success: false, message: error.message }

  revalidatePath(`/clients/${input.clientId}`)
  return { success: true, message: input.enabled ? "Autopay enabled." : "Autopay disabled." }
}

export async function createAutopaySetupSession(input: {
  clientId: string
}): Promise<BillingSettingsActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id, name, email")
    .eq("id", input.clientId)
    .eq("business_id", businessId)
    .single()

  if (clientError || !client) return { success: false, message: "Client not found." }

  const { data: settings } = await db
    .from("client_billing_settings")
    .select("stripe_customer_id")
    .eq("client_id", input.clientId)
    .eq("business_id", businessId)
    .maybeSingle()

  const customerId = await ensureStripeCustomer({
    existingCustomerId: settings?.stripe_customer_id,
    clientId: input.clientId,
    businessId,
    email: client.email,
    name: client.name,
  })

  await db.from("client_billing_settings").upsert(
    {
      business_id: businessId,
      client_id: input.clientId,
      autopay_mode: "invoice_due_date",
      stripe_customer_id: customerId,
    },
    { onConflict: "business_id,client_id" },
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    success_url: `${appUrl}/clients/${input.clientId}?autopay_setup=1`,
    cancel_url: `${appUrl}/clients/${input.clientId}?autopay_setup=0`,
    metadata: {
      business_id: businessId,
      client_id: input.clientId,
      purpose: "autopay_setup",
    },
  })

  if (!session.url) return { success: false, message: "Failed to create setup session." }

  return { success: true, message: "Setup session created.", setupUrl: session.url }
}
