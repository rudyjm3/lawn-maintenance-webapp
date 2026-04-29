"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { saveServiceType } from "@/app/actions/service-catalog"
import type { ServiceType } from "@/types"

interface FormValues {
  name: string
  default_duration_min: string
  default_price: string
  is_recurring: boolean
  is_seasonal: boolean
}

interface ServiceTypeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceType?: ServiceType
}

export function ServiceTypeSheet({ open, onOpenChange, serviceType }: ServiceTypeSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!serviceType

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      default_duration_min: "60",
      default_price: "0",
      is_recurring: false,
      is_seasonal: false,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const isRecurring = watch("is_recurring")
  const isSeasonal = watch("is_seasonal")

  useEffect(() => {
    if (open) {
      if (serviceType) {
        reset({
          name: serviceType.name,
          default_duration_min: String(serviceType.default_duration_min),
          default_price: String(serviceType.default_price),
          is_recurring: serviceType.is_recurring,
          is_seasonal: serviceType.is_seasonal,
        })
      } else {
        reset({ name: "", default_duration_min: "60", default_price: "0", is_recurring: false, is_seasonal: false })
      }
    }
  }, [open, serviceType, reset])

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    const result = await saveServiceType({
      id: serviceType?.id,
      name: data.name,
      default_duration_min: Number(data.default_duration_min),
      default_price: Number(data.default_price),
      is_recurring: data.is_recurring,
      is_seasonal: data.is_seasonal,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>{isEditing ? "Edit Service" : "Add Service"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this service type. Changes apply to all future jobs."
              : "Define a new service type. You can assign it to properties after saving."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="service-type-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Service name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Weekly Mow"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default_duration_min">Default duration (min)</Label>
              <Input
                id="default_duration_min"
                type="number"
                min={1}
                step={5}
                {...register("default_duration_min", { required: true, min: 1 })}
              />
              {errors.default_duration_min && (
                <p className="text-xs text-destructive">At least 1 minute</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default_price">Default price ($)</Label>
              <Input
                id="default_price"
                type="number"
                min={0}
                step={0.01}
                {...register("default_price", { required: true, min: 0 })}
              />
              {errors.default_price && (
                <p className="text-xs text-destructive">Must be 0 or more</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="is_recurring" className="text-sm font-medium">
                  Recurring service
                </Label>
                <p className="text-xs text-muted-foreground">
                  Repeats on a set schedule (weekly, biweekly, etc.)
                </p>
              </div>
              <Switch
                id="is_recurring"
                checked={isRecurring}
                onCheckedChange={(v) => setValue("is_recurring", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="is_seasonal" className="text-sm font-medium">
                  Seasonal service
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only active during certain months of the year
                </p>
              </div>
              <Switch
                id="is_seasonal"
                checked={isSeasonal}
                onCheckedChange={(v) => setValue("is_seasonal", v)}
              />
            </div>
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </SheetClose>
          <Button type="submit" form="service-type-form" disabled={isSubmitting}>
            <Wrench className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Add Service"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
