"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { generateInvoiceFromJobs } from "@/app/actions/invoices"
import { type Client } from "@/types"

interface UninvoicedJob {
  id: string
  client_id: string
  price: number
  service_date: string | null
  service_type?: { name: string }
  property?: { address: string }
}

interface Props {
  clients: Client[]
  uninvoicedJobs: UninvoicedJob[]
}

export function GenerateFromJobsDialog({ clients, uninvoicedJobs }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [clientId, setClientId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [taxRate, setTaxRate] = useState("0")
  const [notes, setNotes] = useState("")
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])

  const clientJobs = uninvoicedJobs.filter((j) => j.client_id === clientId)

  useEffect(() => {
    setSelectedJobIds(clientJobs.map((j) => j.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function toggleJob(id: string) {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    if (selectedJobIds.length === 0) {
      toast.error("Select at least one job.")
      return
    }
    startTransition(async () => {
      const result = await generateInvoiceFromJobs({
        client_id: clientId,
        job_ids: selectedJobIds,
        due_date: dueDate || null,
        tax_rate: parseFloat(taxRate) || 0,
        notes: notes || null,
      })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        if (result.id) router.push(`/invoices/${result.id}`)
      } else {
        toast.error(result.message)
      }
    })
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setClientId("")
      setDueDate("")
      setTaxRate("0")
      setNotes("")
      setSelectedJobIds([])
    }
  }

  const subtotal = clientJobs
    .filter((j) => selectedJobIds.includes(j.id))
    .reduce((sum, j) => sum + Number(j.price), 0)
  const tax = subtotal * ((parseFloat(taxRate) || 0) / 100)
  const total = subtotal + tax

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1.5" />
          Generate from Jobs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice from Jobs</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="client">Client</Label>
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {clientId && (
            <div className="space-y-1.5">
              <Label>Completed Jobs</Label>
              {clientJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No uninvoiced completed jobs for this client.</p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border max-h-56 overflow-y-auto">
                  {clientJobs.map((job) => (
                    <label
                      key={job.id}
                      className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedJobIds.includes(job.id)}
                        onChange={() => toggleJob(job.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.service_type?.name ?? "Service"}
                          {job.property?.address ? ` — ${job.property.address}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.service_date
                            ? new Date(job.service_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "No date"}{" "}
                          · ${Number(job.price).toFixed(2)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Optional notes for the client…"
            />
          </div>

          {selectedJobIds.length > 0 && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({taxRate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !clientId || selectedJobIds.length === 0}>
              {isPending ? "Creating…" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
