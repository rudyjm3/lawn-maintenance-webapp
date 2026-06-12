import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { token, action, date } = await req.json() as {
    token: string
    action: "confirm" | "alternative"
    date?: string
  }

  if (!token || !action) {
    return NextResponse.json({ error: "Missing token or action." }, { status: 400 })
  }
  if (action === "alternative" && !date) {
    return NextResponse.json({ error: "A date is required for alternative requests." }, { status: 400 })
  }
  if (action === "alternative" && date) {
    const [y, mo, d] = date.split("-").map(Number)
    const parsed = new Date(Date.UTC(y, mo - 1, d))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: req2, error: fetchError } = await db
    .from("reschedule_requests")
    .select("id, status")
    .eq("token", token)
    .maybeSingle()

  if (fetchError || !req2) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 })
  }

  if (req2.status !== "pending") {
    return NextResponse.json({ success: true, alreadyResponded: true })
  }

  const { error: updateError } = await db
    .from("reschedule_requests")
    .update({
      status: action === "confirm" ? "confirmed" : "alternative_requested",
      client_chosen_date: action === "alternative" ? date : null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", req2.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
