"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"

export type PaymentActionState =
  | { success: true; message: string }
  | { success: false; message: string }

// ─── Schema ───────────────────────────────────────────────────────────────────

const PaymentSchema = z.object({
  invoice_id: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  method: z.string().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type RecordPaymentValues = z.infer<typeof PaymentSchema>

// ─── Record payment ───────────────────────────────────────────────────────────

export async function recordPayment(values: RecordPaymentValues): Promise<PaymentActionState> {
  const parsed = PaymentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { invoice_id, amount, method, payment_date, reference, notes } = parsed.data

  // Fetch invoice to validate it belongs to this business and get total
  const { data: invoice, error: invoiceError } = await db
    .from("invoices")
    .select("id, total, status")
    .eq("id", invoice_id)
    .eq("business_id", businessId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    return { success: false, message: "Invoice not found." }
  }

  if (invoice.status === "paid" || invoice.status === "void") {
    return { success: false, message: `Cannot record payment on a ${invoice.status} invoice.` }
  }

  // Insert payment
  const { error: paymentError } = await db.from("payments").insert({
    business_id: businessId,
    invoice_id,
    amount,
    method: method || null,
    payment_date,
    reference: reference || null,
    notes: notes || null,
  })

  if (paymentError) return { success: false, message: paymentError.message }

  // Recalculate total paid and update invoice status
  const { data: allPayments, error: sumError } = await db
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice_id)
    .eq("business_id", businessId)

  if (!sumError && allPayments) {
    const totalPaid = (allPayments as { amount: number }[]).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    )
    const invoiceTotal = Number(invoice.total) || 0
    let newStatus: string

    if (totalPaid >= invoiceTotal) {
      newStatus = "paid"
    } else if (totalPaid > 0) {
      newStatus = "partial"
    } else {
      newStatus = invoice.status
    }

    if (newStatus !== invoice.status) {
      await db
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoice_id)
    }
  }

  revalidatePath("/payments")
  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  revalidatePath("/reports")
  return { success: true, message: `Payment of $${amount.toFixed(2)} recorded.` }
}

// ─── Delete payment ───────────────────────────────────────────────────────────

export async function deletePayment(paymentId: string): Promise<PaymentActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch payment for validation and invoice re-calculation
  const { data: payment, error: fetchError } = await db
    .from("payments")
    .select("id, invoice_id, amount")
    .eq("id", paymentId)
    .eq("business_id", businessId)
    .maybeSingle()

  if (fetchError || !payment) return { success: false, message: "Payment not found." }

  const { error } = await db
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  // Recalculate invoice status after deletion
  const { data: remaining } = await db
    .from("payments")
    .select("amount")
    .eq("invoice_id", payment.invoice_id)
    .eq("business_id", businessId)

  const { data: invoice } = await db
    .from("invoices")
    .select("total, status")
    .eq("id", payment.invoice_id)
    .maybeSingle()

  if (invoice && remaining) {
    const totalPaid = (remaining as { amount: number }[]).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    )
    const invoiceTotal = Number(invoice.total) || 0
    let newStatus: string

    if (totalPaid >= invoiceTotal && totalPaid > 0) {
      newStatus = "paid"
    } else if (totalPaid > 0) {
      newStatus = "partial"
    } else if (invoice.status === "paid" || invoice.status === "partial") {
      newStatus = "sent"
    } else {
      newStatus = invoice.status
    }

    if (newStatus !== invoice.status) {
      await db
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", payment.invoice_id)
    }
  }

  revalidatePath("/payments")
  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  revalidatePath("/reports")
  return { success: true, message: "Payment deleted." }
}
