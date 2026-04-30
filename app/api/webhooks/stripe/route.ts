import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyInvoicePayment } from "@/lib/billing/payments"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  if (!process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true })

  const session = event.data.object
  const businessId = session.metadata?.business_id
  if (!businessId) return NextResponse.json({ received: true })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (session.mode === "payment") {
    const invoiceId = session.metadata?.invoice_id
    if (!invoiceId) return NextResponse.json({ received: true })

    const { data: invoice } = await db
      .from("invoices")
      .select("id, total, invoice_number, client_id")
      .eq("id", invoiceId)
      .eq("business_id", businessId)
      .single()

    if (invoice) {
      await applyInvoicePayment(db, {
        businessId,
        invoiceId,
        amount: Number(invoice.total),
        method: "stripe",
        paymentDate: new Date().toISOString().split("T")[0],
        reference: session.id,
        notes: "Paid via Stripe",
      })

      await db
        .from("invoices")
        .update({
          stripe_payment_intent_id: session.payment_intent ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId)
        .eq("business_id", businessId)

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

  if (session.mode === "setup" && session.metadata?.purpose === "autopay_setup") {
    const clientId = session.metadata?.client_id
    if (!clientId || !session.setup_intent || !session.customer) return NextResponse.json({ received: true })

    const setupIntent = await stripe.setupIntents.retrieve(String(session.setup_intent), {
      expand: ["payment_method"],
    })
    const paymentMethod = setupIntent.payment_method as { id: string; card?: { brand?: string; last4?: string } } | null

    if (paymentMethod) {
      await db.from("client_billing_settings").upsert(
        {
          business_id: businessId,
          client_id: clientId,
          autopay_enabled: true,
          autopay_mode: "invoice_due_date",
          stripe_customer_id: String(session.customer),
          stripe_default_payment_method_id: paymentMethod.id,
          stripe_default_payment_method_brand: paymentMethod.card?.brand ?? null,
          stripe_default_payment_method_last4: paymentMethod.card?.last4 ?? null,
        },
        { onConflict: "business_id,client_id" },
      )
    }
  }

  return NextResponse.json({ received: true })
}
