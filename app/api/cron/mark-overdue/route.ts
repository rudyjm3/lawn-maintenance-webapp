import { NextRequest, NextResponse } from "next/server"
import { todayUtc } from "@/lib/dates"
import { sendOverdueReminderEmail } from "@/lib/email/send-overdue-reminder"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })
  }

  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const today = todayUtc()

  const { data: businesses, error: businessesError } = await db
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: true })

  if (businessesError) {
    return NextResponse.json({ error: businessesError.message }, { status: 500 })
  }

  const results: Array<{
    businessId: string
    businessName: string
    markedCount: number
    emailsSent: number
    error?: string
  }> = []

  for (const business of businesses ?? []) {
    try {
      const { data: overdueInvoices, error: fetchError } = await db
        .from("invoices")
        .select(
          "id, invoice_number, total, subtotal, tax, due_date, notes, stripe_payment_link, client_id, client:clients(id, name, email), items:invoice_items(*)",
        )
        .eq("business_id", business.id)
        .in("status", ["sent", "partial"])
        .not("due_date", "is", null)
        .lt("due_date", today)

      if (fetchError) {
        results.push({
          businessId: business.id,
          businessName: business.business_name,
          markedCount: 0,
          emailsSent: 0,
          error: fetchError.message,
        })
        continue
      }

      if (!overdueInvoices || overdueInvoices.length === 0) {
        results.push({
          businessId: business.id,
          businessName: business.business_name,
          markedCount: 0,
          emailsSent: 0,
        })
        continue
      }

      const ids = overdueInvoices.map((inv: { id: string }) => inv.id)

      await db
        .from("invoices")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("business_id", business.id)
        .in("id", ids)

      let emailsSent = 0

      for (const invoice of overdueInvoices) {
        const emailResult = await sendOverdueReminderEmail({
          ...invoice,
          business_id: business.id,
        })

        if (emailResult.success && invoice.client_id) {
          await db.from("communications").insert({
            business_id: business.id,
            client_id: invoice.client_id,
            channel: "email",
            direction: "outbound",
            message: `Overdue reminder sent for Invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)})`,
          })
          emailsSent++
        }
      }

      results.push({
        businessId: business.id,
        businessName: business.business_name,
        markedCount: overdueInvoices.length,
        emailsSent,
      })
    } catch (error) {
      results.push({
        businessId: business.id,
        businessName: business.business_name,
        markedCount: 0,
        emailsSent: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({
    today,
    totalMarked: results.reduce((sum, r) => sum + r.markedCount, 0),
    totalEmailsSent: results.reduce((sum, r) => sum + r.emailsSent, 0),
    failedBusinesses: results.filter((r) => !!r.error).length,
    results,
  })
}
