"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { ClipboardPlus, Save } from "lucide-react"
import { saveOneOffJob, updateJob } from "@/app/actions/jobs"
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
import { Textarea } from "@/components/ui/textarea"
import type { Client, Job, JobStatus, Property } from "@/types"

const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
  { value: "cancelled", label: "Cancelled" },
]

interface AddJobSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  properties: Property[]
  defaultClientId?: string
  job?: Job
}

interface JobFormValues {
  client_id: string
  property_id: string
  title: string
  description: string
  service_date: string
  estimated_duration_min: string
  price: string
  photo_required: boolean
  status: JobStatus
}

export function AddJobSheet({
  open,
  onOpenChange,
  clients,
  properties,
  defaultClientId,
  job,
}: AddJobSheetProps) {
  const isEditing = !!job
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId ?? "")
  const [photoRequired, setPhotoRequired] = useState(false)
  const [status, setStatus] = useState<JobStatus>("unscheduled")

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<JobFormValues>({
    defaultValues: {
      client_id: defaultClientId ?? "",
      property_id: "",
      title: "",
      description: "",
      service_date: "",
      estimated_duration_min: "60",
      price: "0",
      photo_required: false,
      status: "unscheduled",
    },
  })

  useEffect(() => {
    if (open && isEditing && job) {
      setSelectedClientId(job.client_id)
      setPhotoRequired(job.photo_required)
      setStatus(job.status)
      reset({
        client_id: job.client_id,
        property_id: job.property_id,
        title: job.title ?? "",
        description: job.description ?? "",
        service_date: job.service_date ?? "",
        estimated_duration_min: String(job.estimated_duration_min),
        price: String(job.price),
        photo_required: job.photo_required,
        status: job.status,
      })
    } else if (open && !isEditing) {
      setSelectedClientId(defaultClientId ?? "")
      setPhotoRequired(false)
      setStatus("unscheduled")
      reset({
        client_id: defaultClientId ?? "",
        property_id: "",
        title: "",
        description: "",
        service_date: "",
        estimated_duration_min: "60",
        price: "0",
        photo_required: false,
        status: "unscheduled",
      })
    }
  }, [open, isEditing, job, defaultClientId, reset])

  const propertyOptions = useMemo(
    () =>
      properties.filter((property) =>
        selectedClientId ? property.client_id === selectedClientId : true,
      ),
    [properties, selectedClientId],
  )

  const editingClient = isEditing ? clients.find((c) => c.id === job.client_id) : undefined
  const editingProperty = isEditing ? properties.find((p) => p.id === job.property_id) : undefined

  async function onSubmit(data: JobFormValues) {
    setIsSubmitting(true)

    if (isEditing) {
      const result = await updateJob({
        id: job.id,
        title: data.title,
        description: data.description,
        service_date: data.service_date,
        estimated_duration_min: Number(data.estimated_duration_min),
        price: Number(data.price),
        photo_required: photoRequired,
        status,
      })
      setIsSubmitting(false)
      if (!result.success) { toast.error(result.message); return }
      toast.success(result.message)
      onOpenChange(false)
      return
    }

    const result = await saveOneOffJob({
      client_id: data.client_id,
      property_id: data.property_id,
      title: data.title,
      description: data.description,
      service_date: data.service_date,
      estimated_duration_min: Number(data.estimated_duration_min),
      price: Number(data.price),
      photo_required: photoRequired,
    })
    setIsSubmitting(false)
    if (!result.success) { toast.error(result.message); return }
    toast.success(result.message)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>{isEditing ? "Edit Job" : "Add One-Off Job"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the job details below."
              : "Create a standalone job with custom date, duration, and price."}
          </SheetDescription>
        </SheetHeader>

        <form id="job-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-4 py-2">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Client</Label>
                <p className="text-sm font-medium text-foreground">{editingClient?.name ?? "—"}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Property</Label>
                <p className="text-sm font-medium text-foreground">{editingProperty?.address ?? "—"}</p>
              </div>
            </div>
          ) : (
            <>
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
                  onValueChange={(value) => {
                    setValue("property_id", value)
                    const prop = properties.find((p) => p.id === value)
                    if (prop?.photo_required !== undefined) {
                      setPhotoRequired(prop.photo_required)
                      setValue("photo_required", prop.photo_required)
                    }
                  }}
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
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Job title</Label>
            <Input
              id="title"
              placeholder="e.g. Spring cleanup, Gutter cleaning…"
              {...register("title")}
            />
            <p className="text-xs text-muted-foreground">Shown to the crew on the job detail page</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description / instructions</Label>
            <Textarea
              id="description"
              placeholder="Describe what needs to be done, any special instructions…"
              rows={3}
              className="resize-none"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service_date">Service date</Label>
              <Input id="service_date" type="date" {...register("service_date")} />
              {!isEditing && (
                <p className="text-xs text-muted-foreground">Leave blank to keep it unscheduled</p>
              )}
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
            {isEditing ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
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
            )}
          </div>

          {isEditing && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label htmlFor="photo_required_edit" className="cursor-pointer">Before/after photos required</Label>
              <Switch
                id="photo_required_edit"
                checked={photoRequired}
                onCheckedChange={setPhotoRequired}
              />
            </div>
          )}
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </SheetClose>
          <Button type="submit" form="job-form" disabled={isSubmitting}>
            {isEditing ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving…" : "Save Changes"}
              </>
            ) : (
              <>
                <ClipboardPlus className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving…" : "Create Job"}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
