"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"

export type CommActionState =
  | { success: true; message: string }
  | { success: false; message: string }

const LogCommSchema = z.object({
  client_id: z.string().uuid(),
  channel: z.enum(["email", "sms", "app"]),
  direction: z.enum(["inbound", "outbound"]),
  message: z.string().min(1, "Message is required.").max(2000),
  job_id: z.string().uuid().optional(),
})

export async function logCommunication(values: {
  client_id: string
  channel: string
  direction: string
  message: string
  job_id?: string
}): Promise<CommActionState> {
  const parsed = LogCommSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error." }
  }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from("communications").insert({
    business_id: businessId,
    client_id: parsed.data.client_id,
    job_id: parsed.data.job_id ?? null,
    channel: parsed.data.channel,
    direction: parsed.data.direction,
    message: parsed.data.message,
    sent_at: new Date().toISOString(),
  })

  if (error) return { success: false, message: error.message }

  revalidatePath(`/clients/${parsed.data.client_id}`)
  return { success: true, message: "Communication logged." }
}
