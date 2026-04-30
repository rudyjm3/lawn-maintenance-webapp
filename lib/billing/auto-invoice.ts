import { roundCents } from "@/lib/billing/tax"

export type CompletedJobForInvoice = {
  id: string
  price: number
  service_date: string | null
  service_type?: { name?: string | null } | null
  property?: { address?: string | null } | null
}

export function buildInvoiceItemsFromCompletedJobs(jobs: CompletedJobForInvoice[]) {
  return jobs.map((job) => ({
    job_id: job.id,
    description: [
      job.service_type?.name ?? "Service",
      job.property?.address ? `- ${job.property.address}` : null,
      job.service_date
        ? `(${new Date(`${job.service_date}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })})`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    qty: 1,
    unit_price: Number(job.price),
  }))
}

export function sumInvoiceItems(
  items: Array<{ qty: number; unit_price: number }>,
  taxRate = 0,
): { subtotal: number; tax: number; total: number } {
  const subtotal = roundCents(items.reduce((sum, item) => sum + Number(item.qty) * Number(item.unit_price), 0))
  const tax = roundCents(subtotal * (taxRate / 100))
  const total = roundCents(subtotal + tax)
  return { subtotal, tax, total }
}
