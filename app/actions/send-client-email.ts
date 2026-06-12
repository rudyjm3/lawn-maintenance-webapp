"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { sendClientMessage } from "@/lib/email/send-client-message"

const Schema = z.object({
  clientId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

export type SendClientEmailState =
  | { success: true; message: string }
  | { success: false; message: string }

export async function sendClientEmail(
  values: z.infer<typeof Schema>
): Promise<SendClientEmailState> {
  const parsed = Schema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error." }
  }

  const supabase = await createClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // Load the client from the DB, scoped to this business — never trust caller-supplied email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id, name, email")
    .eq("id", parsed.data.clientId)
    .eq("business_id", businessId)
    .single()

  if (clientError || !client) {
    return { success: false, message: "Client not found." }
  }
  if (!client.email) {
    return { success: false, message: "This client has no email address on file." }
  }

  const result = await sendClientMessage({
    toEmail: client.email,
    toName: client.name,
    subject: parsed.data.subject,
    body: parsed.data.body,
  })

  if (!result.success) return result

  await db.from("communications").insert({
    business_id: businessId,
    client_id: parsed.data.clientId,
    channel: "email",
    direction: "outbound",
    message: `[Email] ${parsed.data.subject}: ${parsed.data.body.slice(0, 200)}`,
  })

  return result
}
