"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { convertEstimateToServicePlan, type ConvertEstimateValues } from "@/app/actions/estimates"
import { type Property } from "@/types"

interface Props {
  estimateId: string
  properties: Property[]
}

export function ConvertToPlanModal({ estimateId, properties }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, setValue } = useForm<ConvertEstimateValues>({
    defaultValues: {
      estimate_id: estimateId,
      frequency_type: "weekly",
      interval: 1,
      day_of_week: null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
    },
  })

  function onSubmit(data: ConvertEstimateValues) {
    startTransition(async () => {
      const result = await convertEstimateToServicePlan({ ...data, estimate_id: estimateId })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5">
          Convert to Service Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Service Plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Property *</Label>
            <Select onValueChange={(val) => setValue("property_id", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select property…" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                defaultValue="weekly"
                onValueChange={(val) => setValue("frequency_type", val as ConvertEstimateValues["frequency_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Day of Week</Label>
              <Select onValueChange={(val) => setValue("day_of_week", val ? Number(val) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" {...register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" {...register("end_date")} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
