"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { savePropertyService } from "@/app/actions/service-catalog"
import type { ServiceType, PropertyService } from "@/types"

interface FormValues {
  service_type_id: string
  custom_price: string
  duration_min: string
  instructions: string
  is_active: boolean
}

interface AssignServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  clientId: string
  serviceTypes: ServiceType[]
  assignedServiceTypeIds: string[]
  existingService?: PropertyService
}

export function AssignServiceDialog({
  open,
  onOpenChange,
  propertyId,
  clientId,
  serviceTypes,
  assignedServiceTypeIds,
  existingService,
}: AssignServiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!existingService

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      service_type_id: "",
      custom_price: "",
      duration_min: "",
      instructions: "",
      is_active: true,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedTypeId = watch("service_type_id")
  const isActive = watch("is_active")

  const selectedType = useMemo(
    () => serviceTypes.find((st) => st.id === watchedTypeId),
    [serviceTypes, watchedTypeId]
  )

  const availableTypes = useMemo(() => {
    if (isEditing && existingService) {
      return serviceTypes.filter(
        (st) =>
          !assignedServiceTypeIds.includes(st.id) ||
          st.id === existingService.service_type_id
      )
    }
    return serviceTypes.filter((st) => !assignedServiceTypeIds.includes(st.id))
  }, [serviceTypes, assignedServiceTypeIds, isEditing, existingService])

  useEffect(() => {
    if (open) {
      if (existingService) {
        reset({
          service_type_id: existingService.service_type_id,
          custom_price: existingService.custom_price != null ? String(existingService.custom_price) : "",
          duration_min: existingService.duration_min != null ? String(existingService.duration_min) : "",
          instructions: existingService.instructions ?? "",
          is_active: existingService.is_active,
        })
      } else {
        reset({ service_type_id: "", custom_price: "", duration_min: "", instructions: "", is_active: true })
      }
    }
  }, [open, existingService, reset])

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    const result = await savePropertyService({
      id: existingService?.id,
      property_id: propertyId,
      service_type_id: data.service_type_id,
      custom_price: data.custom_price ? Number(data.custom_price) : null,
      duration_min: data.duration_min ? Number(data.duration_min) : null,
      instructions: data.instructions || null,
      is_active: data.is_active,
      client_id: clientId,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service Assignment" : "Assign Service"}</DialogTitle>
        </DialogHeader>

        <form id="assign-service-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
          {/* Service type */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Service type <span className="text-destructive">*</span>
            </Label>
            <Select
              key={existingService?.service_type_id ?? "new"}
              defaultValue={existingService?.service_type_id ?? ""}
              onValueChange={(v) => setValue("service_type_id", v)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a service…" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_type_id && (
              <p className="text-xs text-destructive">Service type is required</p>
            )}
          </div>

          {/* Price + duration overrides */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom_price">Custom price ($)</Label>
              <Input
                id="custom_price"
                type="number"
                min={0}
                step={0.01}
                placeholder={
                  selectedType ? `Default: $${Number(selectedType.default_price).toFixed(2)}` : "Default"
                }
                {...register("custom_price")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="duration_min">Duration override (min)</Label>
              <Input
                id="duration_min"
                type="number"
                min={1}
                placeholder={
                  selectedType ? `Default: ${selectedType.default_duration_min} min` : "Default"
                }
                {...register("duration_min")}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructions">Special instructions</Label>
            <Textarea
              id="instructions"
              rows={3}
              placeholder="e.g. Mow around the rose garden, avoid back patio…"
              {...register("instructions")}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive services are excluded from scheduling
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="assign-service-form" disabled={isSubmitting}>
            <Wrench className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Assign Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
