"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { getNextInvoiceNumber } from "@/lib/billing/invoice-numbers"
import { roundCents } from "@/lib/billing/tax"
import { buildInvoiceItemsFromCompletedJobs } from "@/lib/billing/auto-invoice"
import { z } from "zod"
import { type InvoiceStatus } from "@/types"

export type InvoiceActionState =
  | { success: true; message: string; id?: string }
  | { success: false; message: string }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  id: z.string().optional(),
  job_id: z.string().nullable().optional(),
  description: z.string().min(1, "Description is required"),
  qty: z.coerce.number().min(0.01, "Qty must be > 0"),
  unit_price: z.coerce.number().min(0, "Price must be 0 or more"),
})

const InvoiceSchema = z.object({
  id: z.string().optional(),
  client_id: z.string().min(1, "Client is required"),
  due_date: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().nullable().optional(),
  items: z.array(LineItemSchema).min(1, "At least one line item is required"),
})

export type InvoiceFormValues = z.infer<typeof InvoiceSchema>

// ─── Save invoice (create or update) ─────────────────────────────────────────

export async function saveInvoice(values: InvoiceFormValues): Promise<InvoiceActionState> {
  const parsed = InvoiceSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { id, client_id, due_date, tax_rate, notes, items } = parsed.data

  const subtotal = roundCents(items.reduce((sum, item) => sum + item.qty * item.unit_price, 0))
  const tax = roundCents(subtotal * (tax_rate / 100))
  const total = roundCents(subtotal + tax)

  if (id) {
    const { error } = await db
      .from("invoices")
      .update({ client_id, due_date: due_date ?? null, subtotal, tax, total, notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", businessId)

    if (error) return { success: false, message: error.message }

    await db.from("invoice_items").delete().eq("invoice_id", id).eq("business_id", businessId)

    const itemRows = items.map((item) => ({
      business_id: businessId,
      invoice_id: id,
      job_id: item.job_id ?? null,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      total_price: roundCents(item.qty * item.unit_price),
    }))
    const { error: itemsError } = await db.from("invoice_items").insert(itemRows)
    if (itemsError) return { success: false, message: itemsError.message }

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${id}`)
    return { success: true, message: "Invoice updated.", id }
  }

  const invoice_number = await getNextInvoiceNumber(db, businessId)

  const { data: inv, error: invError } = await db
    .from("invoices")
    .insert({
      business_id: businessId,
      client_id,
      invoice_number,
      status: "draft",
      subtotal,
      tax,
      total,
      due_date: due_date ?? null,
      notes: notes ?? null,
    })
    .select("id")
    .single()

  if (invError) return { success: false, message: invError.message }

  const itemRows = items.map((item) => ({
    business_id: businessId,
    invoice_id: inv.id,
    job_id: item.job_id ?? null,
    description: item.description,
    qty: item.qty,
    unit_price: item.unit_price,
    total_price: roundCents(item.qty * item.unit_price),
  }))

  const { error: itemsError } = await db.from("invoice_items").insert(itemRows)
  if (itemsError) return { success: false, message: itemsError.message }

  revalidatePath("/invoices")
  return { success: true, message: "Invoice created.", id: inv.id }
}

// ─── Generate invoice from completed jobs ────────────────────────────────────

const GenerateFromJobsSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  job_ids: z.array(z.string()).min(1, "Select at least one job"),
  due_date: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().nullable().optional(),
})

export type GenerateFromJobsValues = z.infer<typeof GenerateFromJobsSchema>

export async function generateInvoiceFromJobs(
  values: GenerateFromJobsValues,
): Promise<InvoiceActionState> {
  const parsed = GenerateFromJobsSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { client_id, job_ids, due_date, tax_rate, notes } = parsed.data

  // Fetch jobs with service type info
  const { data: jobs, error: jobsError } = await db
    .from("jobs")
    .select("id, price, service_date, service_type:service_types(name), property:properties(address)")
    .in("id", job_ids)
    .eq("business_id", businessId)
    .eq("client_id", client_id)
    .eq("status", "completed")

  if (jobsError) return { success: false, message: jobsError.message }
  if (!jobs?.length) return { success: false, message: "No completed jobs found." }

  const items = buildInvoiceItemsFromCompletedJobs(
    jobs as Array<{ id: string; price: number; service_date: string | null; service_type?: { name?: string }; property?: { address?: string } }>,
  )

  return saveInvoice({ client_id, due_date, tax_rate, notes, items })
}

// ─── Update invoice status ────────────────────────────────────────────────────

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<InvoiceActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
  return { success: true, message: `Invoice marked as ${status}.` }
}

// ─── Delete invoice ───────────────────────────────────────────────────────────

export async function deleteInvoice(invoiceId: string): Promise<InvoiceActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/invoices")
  return { success: true, message: "Invoice deleted." }
}

// ─── Send invoice — create Stripe checkout session + email ───────────────────

export async function sendInvoice(invoiceId: string): Promise<InvoiceActionState> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: invoice, error: invError } = await db
    .from("invoices")
    .select("*, client:clients(*), items:invoice_items(*)")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single()

  if (invError || !invoice) return { success: false, message: "Invoice not found." }
  if (!invoice.client?.email) return { success: false, message: "Client has no email address." }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const totalCents = Math.round(Number(invoice.total) * 100)

  if (totalCents < 50) {
    return { success: false, message: "Invoice total must be at least $0.50 to create a payment link." }
  }

  // Create Stripe checkout session
  const { stripe } = await import("@/lib/stripe/client")
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: totalCents,
          product_data: {
            name: `Invoice ${invoice.invoice_number}`,
            description: `GreenRoute invoice for ${invoice.client.name}`,
          },
        },
      },
    ],
    metadata: { invoice_id: invoiceId, business_id: businessId },
    customer_email: invoice.client.email,
    success_url: `${appUrl}/invoices/${invoiceId}?paid=1`,
    cancel_url: `${appUrl}/invoices/${invoiceId}`,
  })

  // Store payment link + intent ID on invoice
  await db
    .from("invoices")
    .update({
      stripe_payment_link: session.url,
      stripe_payment_intent_id: session.payment_intent ?? null,
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("business_id", businessId)

  // Send email with payment link
  const invoiceWithLink = { ...invoice, stripe_payment_link: session.url }
  const { sendInvoiceEmail } = await import("@/lib/email/send-invoice")
  const emailResult = await sendInvoiceEmail(invoiceWithLink)
  if (!emailResult.success) return { success: false, message: emailResult.message }

  // Log communication
  if (invoice.client_id) {
    await db.from("communications").insert({
      business_id: businessId,
      client_id: invoice.client_id,
      channel: "email",
      direction: "outbound",
      message: `Invoice ${invoice.invoice_number} sent ($${Number(invoice.total).toFixed(2)})`,
    })
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
  return { success: true, message: emailResult.message }
}

// ─── Record manual payment ────────────────────────────────────────────────────

const RecordPaymentSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  method: z.string().min(1, "Method is required"),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type RecordPaymentValues = z.infer<typeof RecordPaymentSchema>

export async function recordPayment(values: RecordPaymentValues): Promise<InvoiceActionState> {
  const parsed = RecordPaymentSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { invoice_id, amount, method, payment_date, reference, notes } = parsed.data

  // Fetch invoice total to determine new status
  const { data: invoice, error: invError } = await db
    .from("invoices")
    .select("total, payments:payments(amount)")
    .eq("id", invoice_id)
    .eq("business_id", businessId)
    .single()

  if (invError || !invoice) return { success: false, message: "Invoice not found." }

  const { error: payError } = await db.from("payments").insert({
    business_id: businessId,
    invoice_id,
    amount,
    method,
    payment_date,
    reference: reference ?? null,
    notes: notes ?? null,
  })

  if (payError) return { success: false, message: payError.message }

  // Recalculate paid total and set status
  const previousPaid = (invoice.payments ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount),
    0,
  )
  const newPaid = previousPaid + amount
  const invoiceTotal = Number(invoice.total)

  const newStatus: InvoiceStatus =
    newPaid >= invoiceTotal ? "paid" : newPaid > 0 ? "partial" : "sent"

  await db
    .from("invoices")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", invoice_id)
    .eq("business_id", businessId)

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoice_id}`)
  return { success: true, message: `Payment of $${amount.toFixed(2)} recorded.` }
}

// ─── Batch invoice generation ─────────────────────────────────────────────────

export type BatchInvoiceResult = {
  clientId: string
  clientName: string
  invoiceId?: string
  invoiceNumber?: string
  status: "draft" | "sent" | "skipped_no_email" | "error"
  error?: string
}

export type BatchGenerateActionState =
  | { success: true; message: string; results: BatchInvoiceResult[]; createdCount: number; sentCount: number }
  | { success: false; message: string }

export async function batchGenerateInvoices(input: {
  client_ids: string[]
  items: { description: string; qty: number; unit_price: number }[]
  due_date?: string | null
  tax_rate?: number
  notes?: string | null
  send_immediately?: boolean
}): Promise<BatchGenerateActionState> {
  if (!input.client_ids || input.client_ids.length === 0) {
    return { success: false, message: "Select at least one client." }
  }
  if (!input.items || input.items.length === 0 || input.items.every((i) => !i.description.trim())) {
    return { success: false, message: "At least one line item is required." }
  }

  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { success: false, message: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: clients, error: clientsError } = await db
    .from("clients")
    .select("id, name")
    .eq("business_id", businessId)
    .in("id", input.client_ids)

  if (clientsError) return { success: false, message: clientsError.message }

  const clientMap: Record<string, string> = {}
  for (const c of clients ?? []) clientMap[c.id] = c.name

  const taxRate = input.tax_rate ?? 0
  const validItems = input.items.filter((i) => i.description.trim())
  const subtotal = roundCents(validItems.reduce((sum, i) => sum + i.qty * i.unit_price, 0))
  const tax = roundCents(subtotal * (taxRate / 100))
  const total = roundCents(subtotal + tax)

  const results: BatchInvoiceResult[] = []

  for (const client_id of input.client_ids) {
    const clientName = clientMap[client_id] ?? "Unknown"

    const invoice_number = await getNextInvoiceNumber(db, businessId)

    const { data: inv, error: invError } = await db
      .from("invoices")
      .insert({
        business_id: businessId,
        client_id,
        invoice_number,
        status: "draft",
        subtotal,
        tax,
        total,
        due_date: input.due_date ?? null,
        notes: input.notes ?? null,
      })
      .select("id")
      .single()

    if (invError) {
      results.push({ clientId: client_id, clientName, status: "error", error: invError.message })
      continue
    }

    const itemRows = validItems.map((item) => ({
      business_id: businessId,
      invoice_id: inv.id,
      job_id: null,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      total_price: roundCents(item.qty * item.unit_price),
    }))

    const { error: itemsError } = await db.from("invoice_items").insert(itemRows)
    if (itemsError) {
      results.push({ clientId: client_id, clientName, invoiceId: inv.id, invoiceNumber: invoice_number, status: "error", error: itemsError.message })
      continue
    }

    if (!input.send_immediately) {
      results.push({ clientId: client_id, clientName, invoiceId: inv.id, invoiceNumber: invoice_number, status: "draft" })
      continue
    }

    const sendResult = await sendInvoice(inv.id)
    if (sendResult.success) {
      results.push({ clientId: client_id, clientName, invoiceId: inv.id, invoiceNumber: invoice_number, status: "sent" })
    } else if (sendResult.message.toLowerCase().includes("no email")) {
      results.push({ clientId: client_id, clientName, invoiceId: inv.id, invoiceNumber: invoice_number, status: "skipped_no_email" })
    } else {
      results.push({ clientId: client_id, clientName, invoiceId: inv.id, invoiceNumber: invoice_number, status: "error", error: sendResult.message })
    }
  }

  revalidatePath("/invoices")

  const createdCount = results.filter((r) => r.status !== "error").length
  const sentCount = results.filter((r) => r.status === "sent").length

  return {
    success: true,
    message: `${createdCount} invoice(s) created${sentCount > 0 ? `, ${sentCount} sent` : ""}.`,
    results,
    createdCount,
    sentCount,
  }
}



