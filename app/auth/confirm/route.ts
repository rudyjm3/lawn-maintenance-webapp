import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/onboarding"

  const supabase = await createClient()

  let sessionEstablished = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) sessionEstablished = true
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) sessionEstablished = true
  }

  if (!sessionEstablished) {
    return NextResponse.redirect(
      new URL("/login?error=Your+confirmation+link+has+expired.+Please+try+again.", origin),
    )
  }

  // After a successful invite confirmation, create the users table row if it doesn't exist yet.
  // We detect an invited crew member by the presence of business_id + a non-owner role in metadata.
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const meta = user.user_metadata ?? {}
    const isInvitedCrew =
      typeof meta.business_id === "string" &&
      meta.business_id.length > 0 &&
      typeof meta.role === "string" &&
      meta.role !== "owner"

    if (isInvitedCrew) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = createAdminClient() as any

      const { data: existing } = await admin
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (!existing) {
        await admin.from("users").insert({
          business_id: meta.business_id,
          auth_user_id: user.id,
          first_name: meta.first_name ?? "",
          last_name: meta.last_name ?? "",
          role: meta.role,
          is_active: true,
        })
      }
    }
  }

  const destination = type === "recovery" ? "/reset-password" : next
  return NextResponse.redirect(new URL(destination, origin))
}
