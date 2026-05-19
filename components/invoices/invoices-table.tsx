"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import { deleteInvoice } from "@/app/actions/invoices"
import { type Invoice, type InvoiceStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_FILTERS: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Void", value: "void" },
]

interface Props {
  invoices: Invoice[]
}

export function InvoicesTable({ invoices }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client?.name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, search, statusFilter])

  function handleDelete(id: string, number: string) {
    if (!confirm(`Delete invoice ${number}? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteInvoice(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all" ? "No invoices match your filters." : "No invoices yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.client?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    ${Number(inv.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.due_date
                      ? new Date(inv.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
