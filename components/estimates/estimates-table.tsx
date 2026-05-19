"use client"

import { useState, useMemo, useTransition } from "react"
import { Plus, Search, Trash2, SendHorizonal, ThumbsUp, ThumbsDown, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { EstimateStatusBadge } from "@/components/estimates/estimate-status-badge"
import {
  saveEstimate,
  updateEstimateStatus,
  deleteEstimate,
  type EstimateFormValues,
} from "@/app/actions/estimates"
import { type Estimate, type EstimateItem, type Client, type EstimateStatus } from "@/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string
  qty: string
  unit_price: string
  duration_min: string
}

interface EstimatesTableProps {
  estimates: Estimate[]
  clients: Client[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

const STATUS_FILTERS: { label: string; value: EstimateStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
]

const EMPTY_LINE_ITEM: LineItem = { description: "", qty: "1", unit_price: "0", duration_min: "" }

function emptyLineItems(items?: EstimateItem[]): LineItem[] {
  if (items && items.length > 0) {
    return items.map((item) => ({
      description: item.description,
      qty: String(item.qty),
      unit_price: String(item.unit_price),
      duration_min: item.duration_min != null ? String(item.duration_min) : "",
    }))
  }
  return [{ ...EMPTY_LINE_ITEM }]
}

// ─── Estimate Sheet ───────────────────────────────────────────────────────────

function EstimateSheet({
  open,
  onOpenChange,
  clients,
  estimate,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  clients: Client[]
  estimate?: Estimate
}) {
  const isEdit = !!estimate
  const [clientId, setClientId] = useState(estimate?.client_id ?? "")
  const [validUntil, setValidUntil] = useState(estimate?.valid_until ?? "")
  const [taxRate, setTaxRate] = useState("0")
  const [items, setItems] = useState<LineItem[]>(emptyLineItems(estimate?.items))
  const [submitting, setSubmitting] = useState(false)

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.qty || "0") * parseFloat(item.unit_price || "0"),
    0,
  )
  const tax = subtotal * (parseFloat(taxRate || "0") / 100)
  const total = subtotal + tax

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_LINE_ITEM }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) { toast.error("Select a client."); return }
    if (items.some((item) => !item.description.trim())) {
      toast.error("All line items need a description.")
      return
    }

    setSubmitting(true)
    const values: EstimateFormValues = {
      id: estimate?.id,
      client_id: clientId,
      valid_until: validUntil,
      tax_rate: parseFloat(taxRate || "0"),
      items: items.map((item) => ({
        description: item.description,
        qty: parseFloat(item.qty || "1"),
        unit_price: parseFloat(item.unit_price || "0"),
        duration_min: item.duration_min ? parseInt(item.duration_min) : undefined,
      })),
    }

    const result = await saveEstimate(values)
    setSubmitting(false)

    if (result.success) {
      toast.success(result.message)
      onOpenChange(false)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle>{isEdit ? `Edit ${estimate.estimate_number}` : "New Estimate"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update estimate details and line items." : "Build an estimate with line items and send it to a client."}
          </SheetDescription>
        </SheetHeader>

        <form id="estimate-form" onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Client <span className="text-destructive">*</span></Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Line items */}
          <div className="flex flex-col gap-2">
            <Label>Line Items <span className="text-destructive">*</span></Label>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                    <th className="w-20 px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
                    <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-3 py-1.5">
                        <Textarea
                          className="min-h-0 resize-none py-1.5 text-sm"
                          rows={1}
                          placeholder="Description…"
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="text-right text-sm"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right text-sm"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                        {fmt$(parseFloat(item.qty || "0") * parseFloat(item.unit_price || "0"))}
                      </td>
                      <td className="px-1 py-1.5">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Line Item
            </Button>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1.5 text-sm">
            <div className="flex w-64 items-center justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{fmt$(subtotal)}</span>
            </div>
            <div className="flex w-64 items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="h-6 w-16 text-right text-xs"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">%</span>
              </div>
              <span className="tabular-nums">{fmt$(tax)}</span>
            </div>
            <div className="flex w-64 items-center justify-between gap-4 border-t border-border pt-1.5 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{fmt$(total)}</span>
            </div>
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="estimate-form" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Estimate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteEstimateDialog({
  estimate,
  open,
  onOpenChange,
}: {
  estimate: Estimate | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!estimate) return
    startTransition(async () => {
      const result = await deleteEstimate(estimate.id)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {estimate?.estimate_number}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete this draft estimate. This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete Estimate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main table component ─────────────────────────────────────────────────────

export function EstimatesTable({ estimates, clients }: EstimatesTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editEstimate, setEditEstimate] = useState<Estimate | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return estimates.filter((e) => {
      const matchesSearch =
        !q ||
        e.estimate_number.toLowerCase().includes(q) ||
        e.client?.name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || e.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [estimates, search, statusFilter])

  function openNew() {
    setEditEstimate(undefined)
    setSheetOpen(true)
  }

  function openEdit(estimate: Estimate) {
    setEditEstimate(estimate)
    setSheetOpen(true)
  }

  function confirmDelete(estimate: Estimate) {
    setDeleteTarget(estimate)
    setDeleteDialogOpen(true)
  }

  function handleStatusChange(estimateId: string, status: EstimateStatus) {
    startTransition(async () => {
      const result = await updateEstimateStatus(estimateId, status)
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
            placeholder="Search estimates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New Estimate
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count = value === "all" ? estimates.length : estimates.filter((e) => e.status === value).length
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
            <p className="text-sm font-medium text-foreground">No estimates found</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Try a different search term" : "Create your first estimate to get started"}
            </p>
            {!search && (
              <Button size="sm" onClick={openNew} className="mt-2">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New Estimate
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estimate #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Subtotal</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Valid Until</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Created</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((est, i) => (
                <tr
                  key={est.id}
                  className={cn(
                    "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 !== 0 && "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{est.estimate_number}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {est.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden lg:table-cell text-muted-foreground">
                    {fmt$(Number(est.subtotal))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {fmt$(Number(est.total))}
                  </td>
                  <td className="px-4 py-3">
                    <EstimateStatusBadge status={est.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {fmtDate(est.valid_until)}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                    {fmtDate(est.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {est.status === "draft" && (
                        <>
                          <button
                            title="Mark Sent"
                            disabled={isPending}
                            onClick={() => handleStatusChange(est.id, "sent")}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            <SendHorizonal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => openEdit(est)}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => confirmDelete(est)}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {est.status === "sent" && (
                        <>
                          <button
                            title="Approve"
                            disabled={isPending}
                            onClick={() => handleStatusChange(est.id, "approved")}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Reject"
                            disabled={isPending}
                            onClick={() => handleStatusChange(est.id, "rejected")}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {est.status === "approved" && (
                        <button
                          title="Edit"
                          onClick={() => openEdit(est)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
          Showing {filtered.length} of {estimates.length} estimate{estimates.length !== 1 ? "s" : ""}
        </p>
      )}

      <EstimateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clients={clients}
        estimate={editEstimate}
      />

      <DeleteEstimateDialog
        estimate={deleteTarget}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
