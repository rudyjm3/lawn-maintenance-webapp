"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function handleUnsubscribe(
  clientId: string,
  businessId: string,
): Promise<{ success: boolean; message: string }> {
  if (!clientId || !businessId) return { success: false, message: "Invalid unsubscribe link." }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { error } = await db
    .from("clients")
    .update({ marketing_opt_out: true })
    .eq("id", clientId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }
  return { success: true, message: "You have been unsubscribed." }
}
