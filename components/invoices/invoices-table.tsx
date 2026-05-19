"use client"

import { useState, useMemo, useTransition } from "react"
import {
  Plus,
  Search,
  ReceiptText,
  Ban,
  SendHorizonal,
  CreditCard,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge"
import {
  generateInvoiceFromJobs,
  updateInvoiceStatus,
  fetchUninvoicedJobs,
  type UninvoicedJob,
  type GenerateFromJobsValues,
} from "@/app/actions/invoices"
import { recordPayment, type RecordPaymentValues } from "@/app/actions/payments"
import { type Invoice, type Client, type InvoiceStatus } from "@/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function isPastDue(invoice: Invoice) {
  if (invoice.status === "paid" || invoice.status === "void") return false
  return new Date(invoice.due_date) < new Date(new Date().toISOString().slice(0, 10))
}

// ─── Status filters ───────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Void", value: "void" },
]

// ─── Generate from Jobs Dialog ────────────────────────────────────────────────

function GenerateFromJobsDialog({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  clients: Client[]
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [clientId, setClientId] = useState("")
  const [jobs, setJobs] = useState<UninvoicedJob[]>([])
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState("")
  const [taxRate, setTaxRate] = useState("0")
  const [fetching, setFetching] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setStep(1)
    setClientId("")
    setJobs([])
    setSelectedJobIds(new Set())
    setDueDate("")
    setTaxRate("0")
  }

  async function handleClientContinue() {
    if (!clientId) { toast.error("Select a client."); return }
    setFetching(true)
    const result = await fetchUninvoicedJobs(clientId)
    setFetching(false)

    if (result.error) { toast.error(result.error); return }
    if (!result.jobs.length) {
      toast.info("No uninvoiced completed jobs found for this client.")
      return
    }
    setJobs(result.jobs)
    setSelectedJobIds(new Set(result.jobs.map((j) => j.id)))
    setStep(2)
  }

  function toggleJob(id: string) {
    setSelectedJobIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id))
  const subtotal = selectedJobs.reduce((sum, j) => sum + Number(j.price), 0)
  const tax = subtotal * (parseFloat(taxRate || "0") / 100)
  const total = subtotal + tax

  async function handleGenerate() {
    if (selectedJobIds.size === 0) { toast.error("Select at least one job."); return }
    if (!dueDate) { toast.error("Set a due date."); return }

    setSubmitting(true)
    const values: GenerateFromJobsValues = {
      client_id: clientId,
      job_ids: [...selectedJobIds],
      due_date: dueDate,
      tax_rate: parseFloat(taxRate || "0"),
    }

    const result = await generateInvoiceFromJobs(values)
    setSubmitting(false)

    if (result.success) {
      toast.success(result.message)
      reset()
      onOpenChange(false)
    } else {
      toast.error(result.message)
    }
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Generate Invoice — Select Client" : "Generate Invoice — Select Jobs"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select completed jobs to include. Each selected job becomes a line item.
            </p>

            <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
              {jobs.map((job) => {
                const checked = selectedJobIds.has(job.id)
                const serviceLabel = job.service_type?.name ?? "Service"
                const dateLabel = job.service_date
                  ? new Date(job.service_date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", timeZone: "UTC",
                    })
                  : "No date"
                const address = job.property?.address ?? ""
                return (
                  <label
                    key={job.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/30 transition-colors",
                      checked && "bg-primary/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleJob(job.id)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{serviceLabel} — {dateLabel}</p>
                      <p className="text-xs text-muted-foreground truncate">{address}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground shrink-0">
                      {fmt$(Number(job.price))}
                    </span>
                  </label>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="due-date">Due Date <span className="text-destructive">*</span></Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
            </div>

            {selectedJobs.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""})</span>
                  <span className="tabular-nums">{fmt$(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%)</span>
                  <span className="tabular-nums">{fmt$(tax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                  <span>Total</span>
                  <span className="tabular-nums">{fmt$(total)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleClientContinue} disabled={fetching || !clientId}>
                {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={handleGenerate}
                disabled={submitting || selectedJobIds.size === 0 || !dueDate}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}
                Generate Invoice
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setAmount("")
    setMethod("")
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setReference("")
  }

  async function handleSubmit() {
    if (!invoice) return
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount."); return }
    if (!paymentDate) { toast.error("Set a payment date."); return }

    setSubmitting(true)
    const values: RecordPaymentValues = {
      invoice_id: invoice.id,
      amount: parseFloat(amount),
      method: method || undefined,
      payment_date: paymentDate,
      reference: reference || undefined,
    }
    const result = await recordPayment(values)
    setSubmitting(false)

    if (result.success) {
      toast.success(result.message)
      reset()
      onOpenChange(false)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onOpenChange(false) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment — {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {invoice && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Invoice total</span>
                <span className="tabular-nums font-medium text-foreground">{fmt$(Number(invoice.total))}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-amount">Amount <span className="text-destructive">*</span></Label>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-date">Date <span className="text-destructive">*</span></Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="ach">ACH / Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-ref">Reference #</Label>
              <Input
                id="pay-ref"
                placeholder="Check #, transaction ID…"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InvoicesTable({ invoices, clients }: { invoices: Invoice[]; clients: Client[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [generateOpen, setGenerateOpen] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client?.name?.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invoices, search, statusFilter])

  function openPayment(invoice: Invoice) {
    setPaymentInvoice(invoice)
    setPaymentDialogOpen(true)
  }

  function handleStatusChange(id: string, status: InvoiceStatus) {
    startTransition(async () => {
      const result = await updateInvoiceStatus(id, status)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <>
      {/* Toolbar */}
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
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Generate Invoice
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count = value === "all" ? invoices.length : invoices.filter((inv) => inv.status === value).length
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                statusFilter === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                statusFilter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No invoices found</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Try a different search term" : "Generate your first invoice from completed jobs"}
            </p>
            {!search && (
              <Button size="sm" onClick={() => setGenerateOpen(true)} className="mt-2">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Generate Invoice
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Due Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Created</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={cn(
                    "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 !== 0 && "bg-muted/10",
                    isPastDue(inv) && "bg-red-50/30 dark:bg-red-950/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{inv.invoice_number}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {inv.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {fmt$(Number(inv.total))}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className={cn(
                    "px-4 py-3 hidden lg:table-cell",
                    isPastDue(inv) ? "text-destructive font-medium" : "text-muted-foreground",
                  )}>
                    {fmtDate(inv.due_date)}
                    {isPastDue(inv) && <span className="ml-1.5 text-xs font-normal">(past due)</span>}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                    {fmtDate(inv.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {inv.status === "draft" && (
                        <button
                          title="Mark Sent"
                          disabled={isPending}
                          onClick={() => handleStatusChange(inv.id, "sent")}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        >
                          <SendHorizonal className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {inv.status !== "paid" && inv.status !== "void" && (
                        <button
                          title="Record Payment"
                          onClick={() => openPayment(inv)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {inv.status !== "void" && inv.status !== "paid" && (
                        <button
                          title="Void Invoice"
                          disabled={isPending}
                          onClick={() => handleStatusChange(inv.id, "void")}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
      )}

      <GenerateFromJobsDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        clients={clients}
      />

      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />
    </>
  )
}
