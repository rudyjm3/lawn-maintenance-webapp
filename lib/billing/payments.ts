import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export async function applyInvoicePayment(db: SupabaseClient<Database>, params: {
  businessId: string
  invoiceId: string
  amount: number
  method: string
  paymentDate: string
  reference?: string | null
  notes?: string | null
}) {
  await db.from("payments").insert({
    business_id: params.businessId,
    invoice_id: params.invoiceId,
    amount: params.amount,
    method: params.method,
    payment_date: params.paymentDate,
    reference: params.reference ?? null,
    notes: params.notes ?? null,
  })

  const { data: invoice } = await db
    .from("invoices")
    .select("total, payments:payments(amount)")
    .eq("id", params.invoiceId)
    .eq("business_id", params.businessId)
    .single()

  const paid = (invoice?.payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const total = Number(invoice?.total ?? 0)
  const status = paid >= total ? "paid" : paid > 0 ? "partial" : "sent"

  await db
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", params.invoiceId)
    .eq("business_id", params.businessId)

  return { status, paid, total }
}
