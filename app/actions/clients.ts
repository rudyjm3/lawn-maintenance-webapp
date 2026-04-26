"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { z } from "zod"

export type ClientActionState =
  | { success: true; message: string }
  | { success: false; message: string }

const ClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  status: z.enum(["lead", "active", "inactive", "archived"]),
  source: z.string().optional(),
  notes: z.string().optional(),
})

export type ClientFormValues = z.infer<typeof ClientSchema>

export async function saveClient(values: ClientFormValues): Promise<ClientActionState> {
  const parsed = ClientSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: businessError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: businessError ?? "Not authenticated." }

  const { id, ...fields } = parsed.data
  const row = {
    name: fields.name,
    email: fields.email?.trim() || null,
    phone: fields.phone?.trim() || null,
    billing_address: fields.billing_address?.trim() || null,
    status: fields.status,
    source: fields.source || null,
    notes: fields.notes?.trim() || null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (id) {
    const { error } = await db.from("clients").update(row).eq("id", id)
    if (error) return { success: false, message: error.message }
    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    return { success: true, message: `${row.name} updated.` }
  }

  const insertRow = { ...row, business_id: businessId }
  const { error } = await db.from("clients").insert(insertRow)
  if (error) return { success: false, message: error.message }
  revalidatePath("/clients")
  return { success: true, message: `${row.name} added as a client.` }
}
