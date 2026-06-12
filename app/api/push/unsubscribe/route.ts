import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const { endpoint } = await req.json() as { endpoint: string }
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("auth_user_id", user.id)

  return NextResponse.json({ success: true })
}
