"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { sendCampaignEmail } from "@/lib/email/send-campaign"

export type CampaignActionState = { success: boolean; message: string }

export async function createCampaign(subject: string, body: string): Promise<CampaignActionState> {
  const supabase = await createSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: authError } = await getAuthenticatedBusinessId(supabase)
  if (authError || !businessId) return { success: false, message: "Not authenticated." }

  const { error } = await db.from("campaigns").insert({ business_id: businessId, subject, body })
  if (error) return { success: false, message: error.message }

  revalidatePath("/campaigns")
  return { success: true, message: "Campaign saved as draft." }
}

export async function sendCampaign(campaignId: string): Promise<CampaignActionState & { sent?: number }> {
  const supabase = await createSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverDb = supabase as any
  const { businessId, error: authError } = await getAuthenticatedBusinessId(supabase)
  if (authError || !businessId) return { success: false, message: "Not authenticated." }

  const { data: campaign, error: campError } = await serverDb
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("business_id", businessId)
    .single()

  if (campError || !campaign) return { success: false, message: "Campaign not found." }
  if (campaign.status === "sent") return { success: false, message: "Campaign already sent." }

  const { data: business } = await serverDb.from("businesses").select("business_name").eq("id", businessId).single()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: clients, error: clientsError } = await db
    .from("clients")
    .select("id, name, email, marketing_opt_out")
    .eq("business_id", businessId)
    .eq("status", "active")
    .not("email", "is", null)

  if (clientsError) return { success: false, message: clientsError.message }

  const eligible = (clients ?? []).filter(
    (c: { email: string | null; marketing_opt_out: boolean }) => c.email && !c.marketing_opt_out,
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.greenroute.app"
  let sent = 0

  for (const client of eligible) {
    const token = Buffer.from(`${client.id}:${businessId}`).toString("base64url")
    const unsubUrl = `${appUrl}/unsubscribe/${token}`
    const result = await sendCampaignEmail({
      clientName: client.name,
      clientEmail: client.email,
      subject: campaign.subject,
      body: campaign.body,
      businessName: business?.business_name ?? "Your lawn service",
      unsubscribeUrl: unsubUrl,
    })
    if (result.success) sent++
  }

  await db
    .from("campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: sent })
    .eq("id", campaignId)

  revalidatePath("/campaigns")
  return { success: true, message: `Campaign sent to ${sent} client${sent !== 1 ? "s" : ""}.`, sent }
}

export async function getRecipientCount(): Promise<number> {
  const supabase = await createSupabaseClient()
  const { businessId, error: authError } = await getAuthenticatedBusinessId(supabase)
  if (authError || !businessId) return 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { count } = await db
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "active")
    .not("email", "is", null)
    .eq("marketing_opt_out", false)

  return count ?? 0
}
