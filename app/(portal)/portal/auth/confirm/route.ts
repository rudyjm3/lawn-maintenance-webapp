import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = "/portal/dashboard"

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: { user }, error } = await (supabase.auth as any).verifyOtp({ token_hash, type })

    if (!error && user) {
      // Link this auth user to a client_portal_accounts row if not already done
      const admin = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = admin as any

      const existing = await db
        .from("client_portal_accounts")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (!existing.data) {
        // Find the client matching this email
        const { data: client } = await db
          .from("clients")
          .select("id, business_id")
          .eq("email", user.email)
          .maybeSingle()

        if (client) {
          await db.from("client_portal_accounts").upsert(
            { business_id: client.business_id, client_id: client.id, auth_user_id: user.id },
            { onConflict: "business_id,client_id", ignoreDuplicates: true },
          )
        }
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL("/portal/login?error=invalid_link", request.url))
}
