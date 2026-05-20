"use client"

import { useTransition } from "react"
import { ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog"
import { updateInvoiceStatus } from "@/app/actions/invoices"
import { type Invoice } from "@/types"

interface Props {
  invoice: Invoice
}

export function InvoiceDetailCard({ invoice }: Props) {
  const [isPending, startTransition] = useTransition()

  const amountPaid = (invoice.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const remaining = Math.max(0, Number(invoice.total) - amountPaid)

  function handleVoid() {
    if (!confirm("Void this invoice? This cannot be undone.")) return
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoice.id, "void")
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  function handleMarkOverdue() {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoice.id, "overdue")
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-medium text-foreground">{invoice.client?.name ?? "—"}</p>
            {invoice.client?.email && (
              <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
            )}
            {invoice.client?.billing_address && (
              <p className="text-sm text-muted-foreground">{invoice.client.billing_address}</p>
            )}
          </div>

          <div className="text-right space-y-1">
            <InvoiceStatusBadge status={invoice.status} />
            {invoice.due_date && (
              <p className="text-sm text-muted-foreground mt-1">
                Due:{" "}
                {new Date(invoice.due_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Unit Price</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(invoice.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(item.qty).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">${Number(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="min-w-[240px] space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums">${Number(invoice.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span className="tabular-nums">${Number(invoice.total).toFixed(2)}</span>
            </div>
            {amountPaid > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span>
                  <span className="tabular-nums">${amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-1">
                  <span>Balance Due</span>
                  <span className="tabular-nums">${remaining.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground">{invoice.notes}</p>
          </div>
        )}

        {/* Payment link */}
        {invoice.stripe_payment_link && invoice.status !== "paid" && invoice.status !== "void" && (
          <a
            href={invoice.stripe_payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Stripe Payment Link
          </a>
        )}
      </div>

      {/* Payments history */}
      {(invoice.payments ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Payments</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Method</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Reference</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(invoice.payments ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(payment.payment_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 capitalize">{payment.method?.replace("_", " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-green-600">
                    ${Number(payment.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      {invoice.status !== "paid" && invoice.status !== "void" && (
        <div className="flex items-center gap-2 flex-wrap">
          <RecordPaymentDialog
            invoiceId={invoice.id}
            invoiceTotal={Number(invoice.total)}
            amountPaid={amountPaid}
          />
          {invoice.status === "sent" && (
            <Button variant="outline" onClick={handleMarkOverdue} disabled={isPending}>
              Mark Overdue
            </Button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <Button variant="ghost" onClick={handleVoid} disabled={isPending} className="text-destructive hover:text-destructive">
              Void Invoice
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
