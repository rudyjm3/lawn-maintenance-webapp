"use client"

import { useState, useMemo, useTransition } from "react"
import { Search, Trash2, CreditCard } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { deletePayment } from "@/app/actions/payments"
import { type Payment } from "@/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  card: "Card",
  ach: "ACH",
  other: "Other",
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeletePaymentDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: Payment | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!payment) return
    startTransition(async () => {
      const result = await deletePayment(payment.id)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Payment?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will remove the payment of {payment ? fmt$(Number(payment.amount)) : ""} and
          update the invoice status accordingly. This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return payments.filter((p) => {
      const matchesSearch =
        !q ||
        p.invoice?.invoice_number?.toLowerCase().includes(q) ||
        p.invoice?.client?.name?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q)
      const matchesMethod = methodFilter === "all" || p.method === methodFilter
      return matchesSearch && matchesMethod
    })
  }, [payments, search, methodFilter])

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const methods = useMemo(() => {
    const used = new Set(payments.map((p) => p.method).filter(Boolean))
    return [...used] as string[]
  }, [payments])

  function confirmDelete(payment: Payment) {
    setDeleteTarget(payment)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      {/* Summary strip */}
      {payments.length > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground tabular-nums">{fmt$(totalCollected)}</p>
            <p className="text-xs text-muted-foreground">
              Total collected — {payments.length} payment{payments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {methods.length > 0 && (
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {["all", ...methods].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  methodFilter === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "all" ? "All" : (METHOD_LABELS[m] ?? m)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No payments found</p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different search term"
                : "Payments recorded from invoices will appear here"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Method</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Reference</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment, i) => (
                <tr
                  key={payment.id}
                  className={cn(
                    "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 !== 0 && "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {payment.invoice?.invoice_number ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {payment.invoice?.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600">
                    {fmt$(Number(payment.amount))}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground capitalize">
                    {payment.method ? (METHOD_LABELS[payment.method] ?? payment.method) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {payment.reference ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDate(payment.payment_date)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      title="Delete payment"
                      onClick={() => confirmDelete(payment)}
                      className="flex h-7 w-7 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {payments.length} payment{payments.length !== 1 ? "s" : ""}
        </p>
      )}

      <DeletePaymentDialog
        payment={deleteTarget}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
