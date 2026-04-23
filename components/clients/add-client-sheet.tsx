"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
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

interface AddClientFormValues {
  name: string
  email: string
  phone: string
  billing_address: string
  status: string
  source: string
  notes: string
}

interface AddClientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClientSheet({ open, onOpenChange }: AddClientSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddClientFormValues>({
    defaultValues: {
      status: "active",
      source: "website",
    },
  })

  async function onSubmit(data: AddClientFormValues) {
    setIsSubmitting(true)
    // TODO: Replace with real Supabase insert
    await new Promise((r) => setTimeout(r, 600))
    setIsSubmitting(false)
    toast.success(`${data.name} added as a client`)
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>Add Client</SheetTitle>
          <SheetDescription>
            Enter contact details for the new client. You can add properties
            after saving.
          </SheetDescription>
        </SheetHeader>

        <form
          id="add-client-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Full name / Business name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                {...register("email")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                {...register("phone")}
              />
            </div>
          </div>

          {/* Billing address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_address">Billing address</Label>
            <Input
              id="billing_address"
              placeholder="123 Main St, Springfield, IL 62701"
              {...register("billing_address")}
            />
          </div>

          {/* Status + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                defaultValue="active"
                onValueChange={(v) => setValue("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Source</Label>
              <Select
                defaultValue="website"
                onValueChange={(v) => setValue("source", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="ad">Ad</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Gate code, preferred visit time, special instructions…"
              {...register("notes")}
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
            form="add-client-form"
            disabled={isSubmitting}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : "Add Client"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
