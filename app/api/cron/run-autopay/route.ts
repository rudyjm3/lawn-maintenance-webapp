import { NextRequest, NextResponse } from "next/server"
import { todayUtc } from "@/lib/dates"
import { stripe } from "@/lib/stripe/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyInvoicePayment } from "@/lib/billing/payments"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const today = todayUtc()
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: invoices, error } = await db
    .from("invoices")
    .select("id, business_id, client_id, total, due_date, status, autopay_attempted_at, payments:payments(amount)")
    .in("status", ["sent", "partial", "overdue"])
    .not("due_date", "is", null)
    .lte("due_date", today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ invoiceId: string; status: "paid" | "skipped" | "failed"; error?: string }> = []

  for (const invoice of invoices ?? []) {
    const { data: billing } = await db
      .from("client_billing_settings")
      .select("autopay_enabled, stripe_customer_id, stripe_default_payment_method_id")
      .eq("business_id", invoice.business_id)
      .eq("client_id", invoice.client_id)
      .maybeSingle()

    if (!billing?.autopay_enabled) {
      results.push({ invoiceId: invoice.id, status: "skipped", error: "Autopay disabled" })
      continue
    }

    if (!billing.stripe_customer_id || !billing.stripe_default_payment_method_id) {
      results.push({ invoiceId: invoice.id, status: "skipped", error: "Missing saved payment method" })
      continue
    }

    const alreadyTriedToday = typeof invoice.autopay_attempted_at === "string" && invoice.autopay_attempted_at.startsWith(today)
    if (alreadyTriedToday) {
      results.push({ invoiceId: invoice.id, status: "skipped", error: "Already attempted today" })
      continue
    }

    const paid = (invoice.payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
    const outstanding = Math.max(0, Number(invoice.total) - paid)
    if (outstanding <= 0) {
      results.push({ invoiceId: invoice.id, status: "skipped", error: "Already fully paid" })
      continue
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(outstanding * 100),
        currency: "usd",
        customer: billing.stripe_customer_id,
        payment_method: billing.stripe_default_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: {
          business_id: invoice.business_id,
          invoice_id: invoice.id,
          source: "autopay",
        },
      })

      await applyInvoicePayment(db, {
        businessId: invoice.business_id,
        invoiceId: invoice.id,
        amount: outstanding,
        method: "stripe_autopay",
        paymentDate: today,
        reference: intent.id,
        notes: "Paid via autopay",
      })

      await db
        .from("invoices")
        .update({
          autopay_attempted_at: new Date().toISOString(),
          autopay_status: "succeeded",
          stripe_payment_intent_id: intent.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id)
        .eq("business_id", invoice.business_id)

      results.push({ invoiceId: invoice.id, status: "paid" })
    } catch (err) {
      await db
        .from("invoices")
        .update({
          autopay_attempted_at: new Date().toISOString(),
          autopay_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id)
        .eq("business_id", invoice.business_id)

      results.push({
        invoiceId: invoice.id,
        status: "failed",
        error: err instanceof Error ? err.message : "Autopay failed",
      })
    }
  }

  return NextResponse.json({ today, processed: results.length, results })
}
