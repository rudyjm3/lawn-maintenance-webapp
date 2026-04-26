import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export async function getAuthenticatedBusinessId(
  supabase: SupabaseClient<Database>,
): Promise<{ businessId: string | null; error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { businessId: null, error: userError.message }
  }

  if (!user) {
    return { businessId: null, error: "Not authenticated." }
  }

  const metadataBusinessId = user.user_metadata?.business_id
  if (typeof metadataBusinessId === "string" && metadataBusinessId.length > 0) {
    return { businessId: metadataBusinessId, error: null }
  }

  const { data, error } = await supabase
    .from("users")
    .select("business_id")
    .eq("auth_user_id", user.id)
    .single()

  if (error) {
    return { businessId: null, error: error.message }
  }

  return { businessId: data.business_id, error: null }
}
