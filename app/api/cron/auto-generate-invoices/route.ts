import { NextRequest, NextResponse } from "next/server"
import { todayUtc } from "@/lib/dates"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNextInvoiceNumber } from "@/lib/billing/invoice-numbers"
import { buildInvoiceItemsFromCompletedJobs, sumInvoiceItems } from "@/lib/billing/auto-invoice"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 })
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const batchDate = todayUtc()
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: businesses, error: businessesError } = await db.from("businesses").select("id")
  if (businessesError) return NextResponse.json({ error: businessesError.message }, { status: 500 })

  const results: Array<{ businessId: string; createdInvoices: number; jobsInvoiced: number; error?: string }> = []

  for (const business of businesses ?? []) {
    try {
      const { data: invoicedItems } = await db
        .from("invoice_items")
        .select("job_id")
        .eq("business_id", business.id)
        .not("job_id", "is", null)

      const alreadyInvoicedIds = new Set<string>((invoicedItems ?? []).map((r: { job_id: string }) => r.job_id))

      const { data: completedJobs, error: jobsError } = await db
        .from("jobs")
        .select("id, client_id, price, service_date, service_type:service_types(name), property:properties(address)")
        .eq("business_id", business.id)
        .eq("status", "completed")

      if (jobsError) throw new Error(jobsError.message)

      const uninvoiced = (completedJobs ?? []).filter((job: { id: string }) => !alreadyInvoicedIds.has(job.id))
      const grouped = new Map<string, typeof uninvoiced>()
      for (const job of uninvoiced) {
        const arr = grouped.get(job.client_id) ?? []
        arr.push(job)
        grouped.set(job.client_id, arr)
      }

      let createdInvoices = 0
      let jobsInvoiced = 0

      for (const [clientId, jobs] of grouped.entries()) {
        const items = buildInvoiceItemsFromCompletedJobs(jobs)
        const totals = sumInvoiceItems(items, 0)
        const invoiceNumber = await getNextInvoiceNumber(db, business.id)

        const { data: inv, error: invError } = await db
          .from("invoices")
          .insert({
            business_id: business.id,
            client_id: clientId,
            invoice_number: invoiceNumber,
            status: "draft",
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            due_date: batchDate,
            auto_generated: true,
            auto_generation_batch_date: batchDate,
          })
          .select("id")
          .single()

        if (invError || !inv) continue

        const itemRows = items.map((item) => ({
          business_id: business.id,
          invoice_id: inv.id,
          job_id: item.job_id,
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          total_price: item.qty * item.unit_price,
        }))

        const { error: itemsError } = await db.from("invoice_items").insert(itemRows)
        if (itemsError) {
          await db.from("invoices").delete().eq("id", inv.id)
          continue
        }

        createdInvoices += 1
        jobsInvoiced += jobs.length
      }

      results.push({ businessId: business.id, createdInvoices, jobsInvoiced })
    } catch (error) {
      results.push({
        businessId: business.id,
        createdInvoices: 0,
        jobsInvoiced: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({ batchDate, results })
}
