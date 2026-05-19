"use client"

import { useState, useTransition } from "react"
import { DollarSign } from "lucide-react"
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
import { recordPayment } from "@/app/actions/invoices"

interface Props {
  invoiceId: string
  invoiceTotal: number
  amountPaid: number
}

const PAYMENT_METHODS = ["check", "cash", "bank_transfer", "credit_card", "other"]

export function RecordPaymentDialog({ invoiceId, invoiceTotal, amountPaid }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const remaining = Math.max(0, invoiceTotal - amountPaid)

  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [method, setMethod] = useState("check")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (v) setAmount(remaining.toFixed(2))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await recordPayment({
        invoice_id: invoiceId,
        amount: parseFloat(amount),
        method,
        payment_date: paymentDate,
        reference: reference || null,
        notes: notes || null,
      })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DollarSign className="h-4 w-4 mr-1.5" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {remaining > 0 && (
              <p className="text-xs text-muted-foreground">Remaining balance: ${remaining.toFixed(2)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="method">Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring capitalize"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {m.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_date">Date</Label>
            <Input
              id="payment_date"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference # (optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check number, transaction ID…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
