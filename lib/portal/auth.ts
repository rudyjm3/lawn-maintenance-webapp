import type { SupabaseClient } from "@supabase/supabase-js"

export async function getPortalClientId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from("client_portal_accounts")
    .select("client_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  return data?.client_id ?? null
}
