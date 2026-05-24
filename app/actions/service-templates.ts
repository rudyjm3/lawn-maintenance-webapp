"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ServiceTemplate } from "@/types"

interface UpsertInput {
  id?: string
  name: string
  frequency: string
  service_type_id: string | null
  season_start_month: number | null
  season_end_month: number | null
  default_duration_min: number | null
  default_price: number | null
  instructions: string | null
}

export async function upsertServiceTemplate(
  input: UpsertInput,
): Promise<{ success: boolean; message: string; template?: ServiceTemplate }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const payload = {
    name: input.name,
    frequency: input.frequency,
    service_type_id: input.service_type_id,
    season_start_month: input.season_start_month,
    season_end_month: input.season_end_month,
    default_duration_min: input.default_duration_min,
    default_price: input.default_price,
    instructions: input.instructions,
  }

  let result
  if (input.id) {
    result = await db
      .from("service_templates")
      .update(payload)
      .eq("id", input.id)
      .select("*, service_type:service_types(id, name, default_duration_min, default_price, is_recurring, is_seasonal)")
      .single()
  } else {
    result = await db
      .from("service_templates")
      .insert(payload)
      .select("*, service_type:service_types(id, name, default_duration_min, default_price, is_recurring, is_seasonal)")
      .single()
  }

  if (result.error) {
    return { success: false, message: result.error.message }
  }

  revalidatePath("/service-catalog")
  return { success: true, message: "Saved.", template: result.data as ServiceTemplate }
}

export async function deleteServiceTemplate(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from("service_templates").delete().eq("id", id)
  if (error) return { success: false, message: error.message }

  revalidatePath("/service-catalog")
  return { success: true, message: "Deleted." }
}
