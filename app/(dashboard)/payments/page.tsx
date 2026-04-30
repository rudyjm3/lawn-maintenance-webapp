import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type SearchParams = Promise<{ q?: string; method?: string; from?: string; to?: string }>

export const metadata = { title: "Payments" }

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  let query = db
    .from("payments")
    .select("id, amount, method, payment_date, reference, created_at, invoice:invoices(id, invoice_number, client:clients(id, name))")
    .order("payment_date", { ascending: false })

  if (params.method) query = query.eq("method", params.method)
  if (params.from) query = query.gte("payment_date", params.from)
  if (params.to) query = query.lte("payment_date", params.to)

  const { data, error } = await query
  if (error) {
    return <div className="p-8 text-sm text-destructive">Failed to load payments: {error.message}</div>
  }

  const q = (params.q ?? "").trim().toLowerCase()
  const payments = (data ?? []).filter((p: any) => {
    if (!q) return true
    return (
      String(p.invoice?.invoice_number ?? "").toLowerCase().includes(q) ||
      String(p.invoice?.client?.name ?? "").toLowerCase().includes(q) ||
      String(p.reference ?? "").toLowerCase().includes(q)
    )
  })

  const totalCollected = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
  const paymentCount = payments.length
  const methods = Array.from(new Set((data ?? []).map((p: any) => p.method).filter(Boolean))) as string[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">Track collected revenue and payment history.</p>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-xl border border-border bg-card p-4">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search invoice/client/reference" className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
        <select name="method" defaultValue={params.method ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All methods</option>
          {methods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={params.from ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input name="to" type="date" defaultValue={params.to ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div className="md:col-span-5 flex justify-end">
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Apply Filters</button>
        </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Collected</p>
          <p className="mt-1 text-xl font-semibold text-foreground">${totalCollected.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Payments</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{paymentCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No payments found.</td>
              </tr>
            )}
            {payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground">{new Date(`${p.payment_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="px-4 py-3">
                  {p.invoice?.id ? (
                    <Link className="text-primary hover:underline" href={`/invoices/${p.invoice.id}`}>{p.invoice.invoice_number}</Link>
                  ) : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.invoice?.client?.name ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.method ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "-"}</td>
                <td className="px-4 py-3 text-right font-medium text-emerald-600">${Number(p.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
