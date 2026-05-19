"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { type InvoiceStatus } from "@/types"

export type InvoiceActionState =
  | { success: true; message: string; id?: string }
  | { success: false; message: string }

export type UninvoicedJob = {
  id: string
  service_date: string | null
  price: number
  estimated_duration_min: number
  property: { address: string } | null
  service_type: { name: string } | null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const GenerateFromJobsSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  job_ids: z.array(z.string()).min(1, "Select at least one job"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date is required"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
})

export type GenerateFromJobsValues = z.infer<typeof GenerateFromJobsSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextInvoiceNumber(db: ReturnType<typeof Object.create>, businessId: string) {
  const { data } = await db
    .from("invoices")
    .select("invoice_number")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (data?.invoice_number) {
    const match = (data.invoice_number as string).match(/(\d+)$/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  return `INV-${String(nextNum).padStart(4, "0")}`
}

// ─── Fetch uninvoiced jobs for client (called from client components) ─────────

export async function fetchUninvoicedJobs(clientId: string): Promise<{
  jobs: UninvoicedJob[]
  error?: string
}> {
  const supabase = await createSupabaseClient()
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId) return { jobs: [], error: bizError ?? "Not authenticated." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // All completed jobs for this client
  const { data: completedJobs, error: jobsError } = await db
    .from("jobs")
    .select("id, service_date, price, estimated_duration_min, property:properties(address), service_type:service_types(name)")
    .eq("business_id", businessId)
    .eq("client_id", clientId)
    .eq("status", "completed")
    .order("service_date", { ascending: false })

  if (jobsError) return { jobs: [], error: jobsError.message }

  if (!completedJobs?.length) return { jobs: [] }

  // Find job_ids already linked to an invoice_item
  const jobIds = (completedJobs as UninvoicedJob[]).map((j) => j.id)
  const { data: invoicedItems } = await db
    .from("invoice_items")
    .select("job_id")
    .eq("business_id", businessId)
    .in("job_id", jobIds)

  const invoicedJobIds = new Set(
    ((invoicedItems ?? []) as { job_id: string }[]).map((ii) => ii.job_id),
  )

  const uninvoiced = (completedJobs as UninvoicedJob[]).filter(
    (j) => !invoicedJobIds.has(j.id),
  )

  return { jobs: uninvoiced }
}

// ─── Generate invoice from completed jobs ─────────────────────────────────────

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
  const { client_id, job_ids, due_date, tax_rate } = parsed.data

  // Fetch selected jobs to build line items
  const { data: jobs, error: jobsError } = await db
    .from("jobs")
    .select("id, service_date, price, estimated_duration_min, property:properties(address), service_type:service_types(name)")
    .eq("business_id", businessId)
    .eq("client_id", client_id)
    .in("id", job_ids)

  if (jobsError || !jobs?.length) {
    return { success: false, message: jobsError?.message ?? "No jobs found." }
  }

  type JobRow = {
    id: string
    service_date: string | null
    price: number
    estimated_duration_min: number
    property: { address: string } | null
    service_type: { name: string } | null
  }

  const subtotal = (jobs as JobRow[]).reduce((sum, j) => sum + (Number(j.price) || 0), 0)
  const tax = Math.round(subtotal * (tax_rate / 100) * 100) / 100
  const total = subtotal + tax

  const invoiceNumber = await nextInvoiceNumber(db, businessId)

  const { data: invoice, error: invoiceError } = await db
    .from("invoices")
    .insert({
      business_id: businessId,
      client_id,
      invoice_number: invoiceNumber,
      status: "draft",
      subtotal,
      tax,
      total,
      due_date,
    })
    .select("id")
    .single()

  if (invoiceError) return { success: false, message: invoiceError.message }

  const itemRows = (jobs as JobRow[]).map((job) => {
    const serviceLabel = job.service_type?.name ?? "Service"
    const dateLabel = job.service_date
      ? new Date(job.service_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      : ""
    return {
      business_id: businessId,
      invoice_id: invoice.id,
      job_id: job.id,
      description: `${serviceLabel}${dateLabel ? ` — ${dateLabel}` : ""}${job.property?.address ? ` (${job.property.address})` : ""}`,
      qty: 1,
      unit_price: Number(job.price) || 0,
      total_price: Number(job.price) || 0,
    }
  })

  const { error: itemsError } = await db.from("invoice_items").insert(itemRows)
  if (itemsError) {
    await db.from("invoices").delete().eq("id", invoice.id)
    return { success: false, message: itemsError.message }
  }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  return { success: true, message: `Invoice ${invoiceNumber} created.`, id: invoice.id }
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
    .update({ status })
    .eq("id", invoiceId)
    .eq("business_id", businessId)

  if (error) return { success: false, message: error.message }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  return { success: true, message: `Invoice marked as ${status}.` }
}
