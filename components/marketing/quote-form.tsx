"use client"

import { useState, useTransition } from "react"
import { submitQuote } from "@/app/actions/leads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const SERVICE_OPTIONS = [
  "Weekly Mow",
  "Bi-Weekly Mow",
  "Spring Cleanup",
  "Fall Cleanup",
  "Hedge Trim",
  "Fertilization",
]

export function QuoteForm() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; service_address?: string }>({})

  function validate(formData: FormData) {
    const nextErrors: { name?: string; email?: string; service_address?: string } = {}
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const serviceAddress = String(formData.get("service_address") ?? "").trim()

    if (!name) nextErrors.name = "Name is required."
    if (!serviceAddress) nextErrors.service_address = "Service address is required."
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address."

    return nextErrors
  }

  function handleSubmit(formData: FormData) {
    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setMessage("Please fix the highlighted fields and try again.")
      setIsSuccess(false)
      return
    }

    setErrors({})
    setMessage(null)
    setIsSuccess(false)

    const requestedServices = formData.getAll("requested_services").map((v) => String(v))
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      service_address: String(formData.get("service_address") ?? ""),
      requested_services: requestedServices,
      notes: String(formData.get("notes") ?? ""),
    }

    startTransition(async () => {
      const result = await submitQuote(payload)
      setIsSuccess(result.success)
      setMessage(result.message)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" name="name" placeholder="Jane Doe" aria-invalid={errors.name ? "true" : "false"} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" aria-invalid={errors.email ? "true" : "false"} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(555) 555-1234" />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="service_address">Service Address *</Label>
          <Input
            id="service_address"
            name="service_address"
            placeholder="123 Main St, Springfield, IL"
            aria-invalid={errors.service_address ? "true" : "false"}
          />
          {errors.service_address && <p className="text-xs text-destructive">{errors.service_address}</p>}
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Requested Services</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SERVICE_OPTIONS.map((service) => (
            <label key={service} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input name="requested_services" value={service} type="checkbox" className="h-4 w-4" />
              <span>{service}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Tell us about your property, access notes, or preferred schedule." />
      </div>

      {message && (
        <p className={isSuccess ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
          {message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Quote Request"}
      </Button>
    </form>
  )
}
