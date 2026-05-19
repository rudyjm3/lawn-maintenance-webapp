"use client"

import { useState, useTransition, useMemo } from "react"
import { Plus, Trash2, AlertCircle, CheckCircle2, XCircle, Mail, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { batchGenerateInvoices, type BatchGenerateActionState, type BatchInvoiceResult } from "@/app/actions/invoices"
import { type Client } from "@/types"

interface LineItemRow {
  description: string
  qty: string
  unit_price: string
}

interface Props {
  clients: Client[]
}

export function BatchInvoiceForm({ clients }: Props) {
  const [isPending, startTransition] = useTransition()
  const [results, setResults] = useState<BatchGenerateActionState | null>(null)

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [clientSearch, setClientSearch] = useState("")
  const [lineItems, setLineItems] = useState<LineItemRow[]>([{ description: "", qty: "1", unit_price: "0" }])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split("T")[0]
  })
  const [taxRate, setTaxRate] = useState("0")
  const [notes, setNotes] = useState("")

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(clientSearch.toLowerCase()),
      ),
    [clients, clientSearch],
  )

  const noEmailClients = useMemo(
    () => [...selectedClientIds].filter((id) => !clients.find((c) => c.id === id)?.email),
    [selectedClientIds, clients],
  )

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + qty * price
    }, 0)
  }, [lineItems])

  const tax = useMemo(() => subtotal * ((parseFloat(taxRate) || 0) / 100), [subtotal, taxRate])
  const total = subtotal + tax
  const batchTotal = total * selectedClientIds.size

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedClientIds.size === filteredClients.length && filteredClients.length > 0) {
      setSelectedClientIds((prev) => {
        const next = new Set(prev)
        filteredClients.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelectedClientIds((prev) => {
        const next = new Set(prev)
        filteredClients.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  function updateLineItem(index: number, field: keyof LineItemRow, value: string) {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", qty: "1", unit_price: "0" }])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(sendImmediately: boolean) {
    if (selectedClientIds.size === 0) {
      toast.error("Select at least one client.")
      return
    }
    const validItems = lineItems.filter((i) => i.description.trim())
    if (validItems.length === 0) {
      toast.error("Add at least one line item with a description.")
      return
    }

    if (sendImmediately && noEmailClients.length > 0) {
      const proceed = confirm(
        `${noEmailClients.length} client(s) have no email address and will be saved as draft only. Continue sending to the rest?`,
      )
      if (!proceed) return
    } else if (sendImmediately) {
      const proceed = confirm(`Send invoices to ${selectedClientIds.size} client(s)?`)
      if (!proceed) return
    }

    startTransition(async () => {
      const result = await batchGenerateInvoices({
        client_ids: [...selectedClientIds],
        items: validItems.map((i) => ({
          description: i.description,
          qty: parseFloat(i.qty) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
        })),
        due_date: dueDate || null,
        tax_rate: parseFloat(taxRate) || 0,
        notes: notes || null,
        send_immediately: sendImmediately,
      })
      setResults(result)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  if (results?.success) {
    return <BatchResults results={results} onReset={() => setResults(null)} />
  }

  const allFilteredSelected =
    filteredClients.length > 0 && filteredClients.every((c) => selectedClientIds.has(c.id))

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Clients</h2>
          <span className="text-xs text-muted-foreground">
            {selectedClientIds.size} selected
          </span>
        </div>
        <Input
          placeholder="Search by name or email…"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex items-center gap-2 pb-1 border-b">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </button>
          {filteredClients.length !== clients.length && (
            <span className="text-xs text-muted-foreground">({filteredClients.length} shown)</span>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {filteredClients.length === 0 && (
            <p className="text-sm text-muted-foreground py-3 text-center">No clients found.</p>
          )}
          {filteredClients.map((client) => (
            <label
              key={client.id}
              className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedClientIds.has(client.id)}
                onChange={() => toggleClient(client.id)}
                className="h-4 w-4 accent-green-600"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{client.name}</span>
                {client.email ? (
                  <span className="text-xs text-muted-foreground ml-2">{client.email}</span>
                ) : (
                  <span className="text-xs text-amber-500 ml-2">No email — draft only</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-medium text-sm">Line Items</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_72px_96px_32px] gap-2 text-xs text-muted-foreground px-1">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit Price</span>
            <span />
          </div>
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_72px_96px_32px] gap-2 items-center">
              <Input
                value={item.description}
                onChange={(e) => updateLineItem(index, "description", e.target.value)}
                placeholder="Description"
                className="h-8 text-sm"
              />
              <Input
                value={item.qty}
                onChange={(e) => updateLineItem(index, "qty", e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="h-8 text-sm text-right"
              />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  value={item.unit_price}
                  onChange={(e) => updateLineItem(index, "unit_price", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 text-sm pl-5 text-right"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeLineItem(index)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Add Line Item
        </Button>
      </div>

      {/* Options */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-medium text-sm mb-4">Options</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tax Rate (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Appears on all invoices in this batch"
              className="text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      {selectedClientIds.size > 0 && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{selectedClientIds.size}</strong> client{selectedClientIds.size !== 1 ? "s" : ""} ·{" "}
              <strong className="text-foreground">${total.toFixed(2)}</strong> per invoice
            </span>
            <span className="font-semibold">${batchTotal.toFixed(2)} total</span>
          </div>
          {noEmailClients.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {noEmailClients.length} client{noEmailClients.length !== 1 ? "s" : ""} without email will be saved as draft only
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Generate Drafts
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isPending}
          className="flex-1"
        >
          <Mail className="h-4 w-4 mr-1.5" />
          {isPending ? "Generating…" : "Generate & Send All"}
        </Button>
      </div>
    </div>
  )
}

function statusBadge(status: BatchInvoiceResult["status"]) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs font-normal">
          <CheckCircle2 className="h-3 w-3" />
          Sent
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="outline" className="text-xs font-normal gap-1">
          <FileText className="h-3 w-3" />
          Draft
        </Badge>
      )
    case "skipped_no_email":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-xs font-normal">
          <AlertCircle className="h-3 w-3" />
          Draft (no email)
        </Badge>
      )
    case "error":
      return (
        <Badge variant="destructive" className="gap-1 text-xs font-normal">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      )
  }
}

function BatchResults({
  results,
  onReset,
}: {
  results: Extract<BatchGenerateActionState, { success: true }>
  onReset: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-base">Batch Complete</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{results.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            New Batch
          </Button>
        </div>
        <div className="space-y-1">
          {results.results.map((r) => (
            <div key={r.clientId} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="min-w-0">
                <span className="text-sm font-medium">{r.clientName}</span>
                {r.invoiceNumber && (
                  <span className="text-xs text-muted-foreground ml-2">#{r.invoiceNumber}</span>
                )}
                {r.error && (
                  <p className="text-xs text-destructive mt-0.5">{r.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {statusBadge(r.status)}
                {r.invoiceId && r.status !== "error" && (
                  <a
                    href={`/invoices/${r.invoiceId}`}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
