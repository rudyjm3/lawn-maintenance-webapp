import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const invoiceId = session.metadata?.invoice_id
    const businessId = session.metadata?.business_id

    if (!invoiceId || !businessId) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Fetch invoice to record payment
    const { data: invoice } = await db
      .from("invoices")
      .select("id, total, invoice_number, client_id")
      .eq("id", invoiceId)
      .eq("business_id", businessId)
      .single()

    if (invoice) {
      // Record the payment
      await db.from("payments").insert({
        business_id: businessId,
        invoice_id: invoiceId,
        amount: Number(invoice.total),
        method: "stripe",
        payment_date: new Date().toISOString().split("T")[0],
        reference: session.id,
        notes: "Paid via Stripe",
      })

      // Mark invoice as paid
      await db
        .from("invoices")
        .update({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .eq("business_id", businessId)

      // Log communication
      if (invoice.client_id) {
        await db.from("communications").insert({
          business_id: businessId,
          client_id: invoice.client_id,
          channel: "email",
          direction: "inbound",
          message: `Payment received for Invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)}) via Stripe`,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
