import { roundCents } from "@/lib/billing/tax"

export type CompletedJobForInvoice = {
  id: string
  price: number
  service_date: string | null
  service_type?: { name?: string | null } | null
  property?: { address?: string | null } | null
}

export function getUninvoicedCompletedJobs<T extends { id: string }>(
  completedJobs: T[],
  alreadyInvoicedIds: Set<string>,
): T[] {
  return completedJobs.filter((job) => !alreadyInvoicedIds.has(job.id))
}

export function groupJobsByClient<T extends { client_id: string }>(jobs: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const job of jobs) {
    const arr = grouped.get(job.client_id) ?? []
    arr.push(job)
    grouped.set(job.client_id, arr)
  }
  return grouped
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
