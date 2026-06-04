"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { createZone, updateZone } from "@/app/actions/zones"
import type { ServiceZone } from "@/types"

const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#1c1917",
]

interface ZoneFormValues {
  name: string
  description: string
  color: string
}

interface ZoneSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zone?: ServiceZone
  onCreated?: (zoneId: string) => void
}

export function ZoneSheet({ open, onOpenChange, zone, onCreated }: ZoneSheetProps) {
  const isEditing = !!zone
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[3])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ZoneFormValues>({
    defaultValues: { name: "", description: "", color: COLOR_PRESETS[3] },
  })

  useEffect(() => {
    if (!open) return
    if (zone) {
      reset({ name: zone.name, description: zone.description ?? "", color: zone.color })
      setSelectedColor(zone.color)
    } else {
      reset({ name: "", description: "", color: COLOR_PRESETS[3] })
      setSelectedColor(COLOR_PRESETS[3])
    }
  }, [open, zone, reset])

  async function onSubmit(data: ZoneFormValues) {
    setIsSubmitting(true)
    const payload = { name: data.name, color: selectedColor, description: data.description || null }

    const result = isEditing
      ? await updateZone(zone!.id, payload)
      : await createZone(payload)

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    onOpenChange(false)
    if (!isEditing && result.id) onCreated?.(result.id)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>{isEditing ? "Edit Zone" : "New Service Zone"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update zone name, color, or description."
              : "Create a zone, then draw its territory on the map."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="zone-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Zone name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. North Side, Commercial District"
              {...register("name", { required: "Zone name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Optional notes about this territory…"
              {...register("description")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label>Zone color</Label>
              <span
                className="inline-block h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    selectedColor === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:border-muted-foreground/50"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="zone-form" disabled={isSubmitting}>
            {isEditing ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Zone"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
