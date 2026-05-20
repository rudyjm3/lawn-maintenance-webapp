import { NextRequest, NextResponse } from "next/server"
import { todayUtc } from "@/lib/dates"
import { sendOverdueReminderEmail } from "@/lib/email/send-overdue-reminder"
import { sendInvoiceEmail } from "@/lib/email/send-invoice"
import { createAdminClient } from "@/lib/supabase/admin"
import { getReminderTypeForDate, type ReminderType } from "@/lib/billing/reminders"

function buildReminderMessage(reminderType: ReminderType, invoiceNumber: string, total: number) {
  const label = reminderType === "due_minus_3"
    ? "Due reminder (-3 days)"
    : reminderType === "due_day"
      ? "Due reminder (today)"
      : reminderType === "overdue_plus_3"
        ? "Overdue reminder (+3 days)"
        : "Overdue reminder (+7 days)"

  return `${label} sent for Invoice ${invoiceNumber} ($${Number(total).toFixed(2)})`
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })

  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const today = todayUtc()

  const { data: businesses, error: businessesError } = await db
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: true })

  if (businessesError) return NextResponse.json({ error: businessesError.message }, { status: 500 })

  const results: Array<{ businessId: string; businessName: string; markedCount: number; emailsSent: number; error?: string }> = []

  for (const business of businesses ?? []) {
    try {
      const { data: invoices, error: fetchError } = await db
        .from("invoices")
        .select("id, invoice_number, status, total, subtotal, tax, due_date, notes, stripe_payment_link, client_id, client:clients(id, name, email), items:invoice_items(*)")
        .eq("business_id", business.id)
        .in("status", ["sent", "partial", "overdue"])
        .not("due_date", "is", null)

      if (fetchError) throw new Error(fetchError.message)

      const overdueIds = (invoices ?? []).filter((i: { due_date: string }) => i.due_date < today).map((i: { id: string }) => i.id)
      if (overdueIds.length > 0) {
        await db.from("invoices").update({ status: "overdue", updated_at: new Date().toISOString() }).eq("business_id", business.id).in("id", overdueIds)
      }

      let emailsSent = 0

      for (const invoice of invoices ?? []) {
        const reminderType = getReminderTypeForDate(invoice.due_date, today)
        if (!reminderType) continue

        const { data: existing } = await db
          .from("invoice_reminders")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("reminder_type", reminderType)
          .maybeSingle()

        if (existing) continue

        const emailResult = reminderType === "due_minus_3" || reminderType === "due_day"
          ? await sendInvoiceEmail({ ...invoice, business_id: business.id })
          : await sendOverdueReminderEmail({ ...invoice, business_id: business.id })

        if (emailResult.success) {
          await db.from("invoice_reminders").insert({
            business_id: business.id,
            invoice_id: invoice.id,
            reminder_type: reminderType,
          })

          if (invoice.client_id) {
            await db.from("communications").insert({
              business_id: business.id,
              client_id: invoice.client_id,
              channel: "email",
              direction: "outbound",
              message: buildReminderMessage(reminderType, invoice.invoice_number, invoice.total),
            })
          }

          emailsSent++
        }
      }

      results.push({
        businessId: business.id,
        businessName: business.business_name,
        markedCount: overdueIds.length,
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
