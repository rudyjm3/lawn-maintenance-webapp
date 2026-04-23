"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { MapPin } from "lucide-react"
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
import { type Client } from "@/types"

interface AddPropertyFormValues {
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
}

export function AddPropertySheet({
  open,
  onOpenChange,
  clients,
  defaultClientId,
}: AddPropertySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, setValue } =
    useForm<AddPropertyFormValues>({
      defaultValues: {
        client_id: defaultClientId ?? "",
        is_commercial: "false",
      },
    })

  async function onSubmit(data: AddPropertyFormValues) {
    setIsSubmitting(true)
    // TODO: Replace with real Supabase insert + geocoding
    await new Promise((r) => setTimeout(r, 600))
    setIsSubmitting(false)
    toast.success("Property added")
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>Add Property</SheetTitle>
          <SheetDescription>
            Add a service address for a client. The address will be geocoded
            when saved.
          </SheetDescription>
        </SheetHeader>

        <form
          id="add-property-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <Label>
              Client <span className="text-destructive">*</span>
            </Label>
            <Select
              defaultValue={defaultClientId ?? ""}
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
              {...register("address", { required: true })}
            />
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
                defaultValue="false"
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
            form="add-property-form"
            disabled={isSubmitting}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : "Add Property"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
