import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export async function getNextEstimateNumber(db: SupabaseClient<Database>, businessId: string): Promise<string> {
  const { data } = await db
    .from("estimates")
    .select("estimate_number")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (!data?.length) return "EST-0001"

  const last = (data[0].estimate_number as string) ?? ""
  const match = last.match(/(\d+)$/)
  const next = match ? parseInt(match[1], 10) + 1 : 1
  return `EST-${String(next).padStart(4, "0")}`
}
