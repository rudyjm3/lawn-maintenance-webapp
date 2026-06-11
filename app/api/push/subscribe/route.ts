import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const { businessId } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return NextResponse.json({ error: "No business found." }, { status: 403 })

  const body = await req.json()
  const { endpoint, keys, role } = body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
    role?: string
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription data." }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from("push_subscriptions").upsert(
    {
      business_id: businessId,
      auth_user_id: user.id,
      role: role ?? "owner",
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    },
    { onConflict: "endpoint" }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
