import { NextRequest, NextResponse } from "next/server"
import { todayUtc } from "@/lib/dates"
import { sendOverdueReminderEmail } from "@/lib/email/send-overdue-reminder"
import { sendInvoiceEmail } from "@/lib/email/send-invoice"
import { createAdminClient } from "@/lib/supabase/admin"
import { getReminderTypeForDate, type ReminderType } from "@/lib/billing/reminders"
import { type Invoice } from "@/types"

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
  const today = todayUtc()

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: true })

  if (businessesError) return NextResponse.json({ error: businessesError.message }, { status: 500 })

  const results: Array<{ businessId: string; businessName: string; markedCount: number; emailsSent: number; error?: string }> = []

  for (const business of businesses ?? []) {
    try {
      const { data: invoices, error: fetchError } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, subtotal, tax, due_date, notes, stripe_payment_link, client_id, client:clients(id, name, email), items:invoice_items(*)")
        .eq("business_id", business.id)
        .in("status", ["sent", "partial", "overdue"])
        .not("due_date", "is", null)

      if (fetchError) throw new Error(fetchError.message)

      const overdueIds = (invoices ?? []).filter((i) => i.due_date && i.due_date < today).map((i) => i.id)
      if (overdueIds.length > 0) {
        await supabase.from("invoices").update({ status: "overdue", updated_at: new Date().toISOString() }).eq("business_id", business.id).in("id", overdueIds)
      }

      let emailsSent = 0

      for (const invoice of invoices ?? []) {
        if (!invoice.due_date) continue
        const reminderType = getReminderTypeForDate(invoice.due_date, today)
        if (!reminderType) continue

        const { data: existing } = await supabase
          .from("invoice_reminders")
          .select("id")
          .eq("invoice_id", invoice.id)
          .eq("reminder_type", reminderType)
          .maybeSingle()

        if (existing) continue

        const invoiceForEmail = { ...invoice, business_id: business.id } as unknown as Invoice
        const emailResult = reminderType === "due_minus_3" || reminderType === "due_day"
          ? await sendInvoiceEmail(invoiceForEmail)
          : await sendOverdueReminderEmail(invoiceForEmail)

        if (emailResult.success) {
          await supabase.from("invoice_reminders").insert({
            business_id: business.id,
            invoice_id: invoice.id,
            reminder_type: reminderType,
          })

          if (invoice.client_id) {
            await supabase.from("communications").insert({
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
