"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { ClipboardPlus } from "lucide-react"
import { saveOneOffJob } from "@/app/actions/jobs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Client, Property } from "@/types"

interface AddJobSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  properties: Property[]
  defaultClientId?: string
}

interface JobFormValues {
  client_id: string
  property_id: string
  service_date: string
  estimated_duration_min: string
  price: string
  photo_required: boolean
}

export function AddJobSheet({
  open,
  onOpenChange,
  clients,
  properties,
  defaultClientId,
}: AddJobSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId ?? "")
  const [photoRequired, setPhotoRequired] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<JobFormValues>({
    defaultValues: {
      client_id: defaultClientId ?? "",
      property_id: "",
      service_date: "",
      estimated_duration_min: "60",
      price: "0",
      photo_required: false,
    },
  })

  const propertyOptions = useMemo(
    () =>
      properties.filter((property) =>
        selectedClientId ? property.client_id === selectedClientId : true,
      ),
    [properties, selectedClientId],
  )

  async function onSubmit(data: JobFormValues) {
    setIsSubmitting(true)
    const result = await saveOneOffJob({
      client_id: data.client_id,
      property_id: data.property_id,
      service_date: data.service_date,
      estimated_duration_min: Number(data.estimated_duration_min),
      price: Number(data.price),
      photo_required: photoRequired,
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
          <SheetTitle>Add One-Off Job</SheetTitle>
          <SheetDescription>
            Create a standalone job with custom date, duration, and price.
          </SheetDescription>
        </SheetHeader>

        <form id="job-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>
              Client <span className="text-destructive">*</span>
            </Label>
            <Select
              defaultValue={defaultClientId ?? ""}
              key={defaultClientId ?? "job-client"}
              onValueChange={(value) => {
                setSelectedClientId(value)
                setValue("client_id", value)
                setValue("property_id", "")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && <p className="text-xs text-destructive">Client is required</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Property <span className="text-destructive">*</span>
            </Label>
            <Select
              key={`${selectedClientId || "all"}-property`}
              onValueChange={(value) => setValue("property_id", value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    selectedClientId ? "Select a property…" : "Choose a client first…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {propertyOptions.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.property_id && <p className="text-xs text-destructive">Property is required</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service_date">Service date</Label>
              <Input id="service_date" type="date" {...register("service_date")} />
              <p className="text-xs text-muted-foreground">Leave blank to keep it unscheduled</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estimated_duration_min">
                Duration (min) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="estimated_duration_min"
                type="number"
                min="1"
                {...register("estimated_duration_min", {
                  required: "Duration is required",
                })}
              />
              {errors.estimated_duration_min && (
                <p className="text-xs text-destructive">{errors.estimated_duration_min.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                {...register("price", { required: "Price is required" })}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="flex flex-col gap-2 pt-6">
              <Label htmlFor="photo_required">Photo required</Label>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">Before/after photos</span>
                <Switch
                  id="photo_required"
                  checked={photoRequired}
                  onCheckedChange={(checked) => {
                    setPhotoRequired(checked)
                    setValue("photo_required", checked)
                  }}
                />
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </SheetClose>
          <Button type="submit" form="job-form" disabled={isSubmitting}>
            <ClipboardPlus className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : "Create Job"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
