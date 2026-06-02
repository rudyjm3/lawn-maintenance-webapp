import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getPortalClientId } from "@/lib/portal/auth"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Invoice" }

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const clientId = await getPortalClientId(supabase)
  if (!clientId) redirect("/portal/login")

  const { data: invoice } = await db
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", id)
    .eq("client_id", clientId)
    .single()

  if (!invoice) notFound()

  const statusColor: Record<string, string> = {
    draft: "text-muted-foreground",
    sent: "text-blue-600",
    partial: "text-amber-600",
    overdue: "text-red-600",
    paid: "text-emerald-600",
    void: "text-muted-foreground",
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to portal
      </Link>

      <div className="rounded-xl border border-border bg-white p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Invoice #{invoice.invoice_number}</h1>
            {invoice.due_date && (
              <p className="text-sm text-muted-foreground">
                Due {new Date(invoice.due_date + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </p>
            )}
          </div>
          <span className={`text-sm font-semibold ${statusColor[invoice.status] ?? "text-foreground"}`}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>

        {/* Line items */}
        {invoice.items && invoice.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unit</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: { id: string; description: string; qty: number; unit_price: number; total_price: number }) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">{item.description}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">${Number(item.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">${Number(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">${Number(invoice.total).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Pay now */}
        {invoice.stripe_payment_link && !["paid", "void"].includes(invoice.status) && (
          <Button asChild className="w-full gap-2">
            <a href={invoice.stripe_payment_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Pay Now — ${Number(invoice.total).toFixed(2)}
            </a>
          </Button>
        )}

        {invoice.status === "paid" && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="font-semibold text-emerald-700">Paid — Thank you!</p>
          </div>
        )}
      </div>
    </div>
  )
}
