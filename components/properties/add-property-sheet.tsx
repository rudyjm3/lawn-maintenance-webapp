"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { MapPin, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { saveProperty } from "@/app/actions/properties"
import { type Client, type Property } from "@/types"

interface PropertyFormValues {
  client_id: string
  address: string
  lawn_size: string
  gate_code: string
  access_notes: string
  pet_notes: string
  is_commercial: string
}

interface AddPropertySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  defaultClientId?: string
  property?: Property
}

export function AddPropertySheet({
  open,
  onOpenChange,
  clients,
  defaultClientId,
  property,
}: AddPropertySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!property

  const { register, handleSubmit, reset, setValue } =
    useForm<PropertyFormValues>({
      defaultValues: {
        client_id: defaultClientId ?? "",
        is_commercial: "false",
      },
    })

  useEffect(() => {
    if (open) {
      if (property) {
        reset({
          client_id: property.client_id,
          address: property.address,
          lawn_size: property.lawn_size ?? "",
          gate_code: property.gate_code ?? "",
          access_notes: property.access_notes ?? "",
          pet_notes: property.pet_notes ?? "",
          is_commercial: property.is_commercial ? "true" : "false",
        })
      } else {
        reset({
          client_id: defaultClientId ?? "",
          address: "",
          lawn_size: "",
          gate_code: "",
          access_notes: "",
          pet_notes: "",
          is_commercial: "false",
        })
      }
    }
  }, [open, property, defaultClientId, reset])

  async function onSubmit(data: PropertyFormValues) {
    setIsSubmitting(true)
    const result = await saveProperty({
      id: property?.id,
      client_id: data.client_id,
      address: data.address,
      lawn_size: data.lawn_size,
      gate_code: data.gate_code,
      access_notes: data.access_notes,
      pet_notes: data.pet_notes,
      is_commercial: data.is_commercial === "true",
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
          <SheetTitle>{isEditing ? "Edit Property" : "Add Property"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this property. The address will be re-geocoded on save."
              : "Add a service address for a client. The address will be geocoded on save."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="property-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Client <span className="text-destructive">*</span>
            </Label>
            <Select
              defaultValue={property?.client_id ?? defaultClientId ?? ""}
              key={property?.client_id ?? defaultClientId ?? "none"}
              onValueChange={(v) => setValue("client_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
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

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">
              Service address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              placeholder="123 Oak Lane, Springfield, IL 62701"
              {...register("address", { required: "Address is required" })}
            />
            <p className="text-xs text-muted-foreground">
              Street, city, state, and ZIP for accurate geocoding
            </p>
          </div>

          {/* Lawn size + type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lawn_size">Lawn size</Label>
              <Input
                id="lawn_size"
                placeholder="0.25 acres"
                {...register("lawn_size")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Property type</Label>
              <Select
                defaultValue={property ? (property.is_commercial ? "true" : "false") : "false"}
                key={property?.id ?? "new"}
                onValueChange={(v) => setValue("is_commercial", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Residential</SelectItem>
                  <SelectItem value="true">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gate code */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gate_code">Gate code</Label>
            <Input
              id="gate_code"
              placeholder="1234"
              {...register("gate_code")}
            />
          </div>

          {/* Access notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access_notes">Access notes</Label>
            <Textarea
              id="access_notes"
              rows={2}
              placeholder="Side gate is unlocked, park in lot B…"
              {...register("access_notes")}
            />
          </div>

          {/* Pet notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pet_notes">Pet warning</Label>
            <Input
              id="pet_notes"
              placeholder="Small dog named Biscuit — keep gate closed"
              {...register("pet_notes")}
            />
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </SheetClose>
          <Button
            type="submit"
            form="property-form"
            disabled={isSubmitting}
          >
            {isEditing ? (
              <Pencil className="mr-2 h-4 w-4" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Add Property"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
