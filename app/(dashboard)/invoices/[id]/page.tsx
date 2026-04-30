import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { InvoiceDetailCard } from "@/components/invoices/invoice-detail-card"
import { SendInvoiceButton } from "@/components/invoices/send-invoice-button"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import type { Invoice } from "@/types"

export const metadata = { title: "Invoice Detail" }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: invoice, error } = await db
    .from("invoices")
    .select(
      "*, client:clients(id, name, email, phone, billing_address, status, source, notes, created_at), items:invoice_items(*), payments:payments(*)",
    )
    .eq("id", id)
    .single()

  if (error || !invoice) notFound()

  const inv = invoice as Invoice

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/invoices"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{inv.invoice_number}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{inv.invoice_number}</h1>
            <InvoiceStatusBadge status={inv.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created{" "}
            {new Date(inv.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {(inv.status === "draft" || inv.status === "sent") && (
          <SendInvoiceButton invoiceId={inv.id} />
        )}
      </div>

      <InvoiceDetailCard invoice={inv} />
    </div>
  )
}
