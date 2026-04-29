"use client"

import { useState, useTransition } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EstimateLineItemsEditor } from "@/components/estimates/estimate-line-items-editor"
import { saveEstimate, type EstimateFormValues } from "@/app/actions/estimates"
import { type Client, type ServiceType } from "@/types"

interface Props {
  clients: Client[]
  serviceTypes: ServiceType[]
}

export function CreateEstimateSheet({ clients, serviceTypes }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const methods = useForm<EstimateFormValues>({
    defaultValues: {
      client_id: "",
      valid_until: "",
      tax_rate: 0,
      notes: "",
      items: [{ service_type_id: null, description: "", qty: 1, unit_price: 0, duration_min: null }],
    },
  })

  const { register, handleSubmit, watch, reset, setValue } = methods
  const items = watch("items") as Array<{ qty: number; unit_price: number }> ?? []
  const taxRate = Number(watch("tax_rate") ?? 0)
  const subtotal = items.reduce((sum, item) => sum + Number(item.qty ?? 0) * Number(item.unit_price ?? 0), 0)
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = subtotal + tax

  function onSubmit(data: EstimateFormValues) {
    startTransition(async () => {
      const result = await saveEstimate(data)
      if (result.success) {
        toast.success(result.message)
        reset()
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Estimate
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Estimate</SheetTitle>
        </SheetHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select
                onValueChange={(val) => setValue("client_id", val)}
                defaultValue=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valid until */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <Input type="date" {...register("valid_until")} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  {...register("tax_rate")}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <Label>Line Items *</Label>
              <EstimateLineItemsEditor serviceTypes={serviceTypes} />
            </div>

            {/* Totals */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({taxRate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                {...register("notes")}
                placeholder="Any additional notes for the client…"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Create Estimate"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  )
}
