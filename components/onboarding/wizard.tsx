"use client"

import { useState, useRef, useActionState } from "react"
import { completeOnboarding } from "@/app/actions/onboarding"
import type { ActionState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Check, ChevronRight, ChevronLeft } from "lucide-react"

// ─── Config ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Business", title: "Tell us about your business" },
  { id: 2, label: "Services", title: "What services do you offer?" },
  { id: 3, label: "Hours", title: "Set your working hours" },
  { id: 4, label: "First Client", title: "Add your first client (optional)" },
]

const DEFAULT_SERVICES = [
  "Weekly Mow",
  "Biweekly Mow",
  "Hedge Trim",
  "Leaf Cleanup",
  "Fertilization",
  "Spring Cleanup",
  "Fall Cleanup",
  "Aeration",
  "Overseeding",
  "Snow Removal",
]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
]

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState(1)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [workDays, setWorkDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"])

  // Captured when the user clicks Next so the data survives step unmounting
  const [step1, setStep1] = useState({
    businessName: "",
    phone: "",
    timezone: "America/New_York",
    serviceRadius: "",
  })
  const [step3, setStep3] = useState({
    workdayStart: "07:00",
    workdayEnd: "17:00",
  })

  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    completeOnboarding,
    null,
  )

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    )
  }

  function toggleDay(day: string) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function handleNext() {
    // Snapshot current step's field values before unmounting them
    if (formRef.current) {
      const fd = new FormData(formRef.current)
      if (step === 1) {
        setStep1({
          businessName: (fd.get("businessName") as string) || "",
          phone: (fd.get("phone") as string) || "",
          timezone: (fd.get("timezone") as string) || "America/New_York",
          serviceRadius: (fd.get("serviceRadius") as string) || "",
        })
      }
      if (step === 3) {
        setStep3({
          workdayStart: (fd.get("workdayStart") as string) || "07:00",
          workdayEnd: (fd.get("workdayEnd") as string) || "17:00",
        })
      }
    }
    setStep((s) => s + 1)
  }

  const isLastStep = step === STEPS.length

  return (
    <form ref={formRef} action={formAction} className="flex w-full max-w-xl flex-col gap-8">

      {/* ── Hidden inputs: carry all multi-step data on submission ── */}

      {/* Step 1 data — hidden when not on step 1 so there's no duplicate name */}
      {step !== 1 && (
        <>
          <input type="hidden" name="businessName"  value={step1.businessName} />
          <input type="hidden" name="phone"         value={step1.phone} />
          <input type="hidden" name="timezone"      value={step1.timezone} />
          <input type="hidden" name="serviceRadius" value={step1.serviceRadius} />
        </>
      )}

      {/* Step 2 data — always hidden (managed by React state) */}
      <input type="hidden" name="services" value={selectedServices.join(",")} />

      {/* Step 3 data — hidden when not on step 3 */}
      {step !== 3 && (
        <>
          <input type="hidden" name="workdayStart" value={step3.workdayStart} />
          <input type="hidden" name="workdayEnd"   value={step3.workdayEnd} />
        </>
      )}

      {/* Step 2 work-days data — always hidden */}
      <input type="hidden" name="workDays" value={workDays.join(",")} />

      {/* ── Progress bar ── */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                step > s.id
                  ? "bg-primary text-primary-foreground"
                  : step === s.id
                    ? "border-2 border-primary text-primary"
                    : "border-2 border-border text-muted-foreground",
              )}
            >
              {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                step === s.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn("h-px flex-1 transition-colors", step > s.id ? "bg-primary" : "bg-border")}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step title ── */}
      <div>
        <h2 className="text-xl font-semibold">{STEPS[step - 1].title}</h2>
        <p className="text-sm text-muted-foreground">
          Step {step} of {STEPS.length}
        </p>
      </div>

      {/* ── Step 1: Business Profile ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name *</Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder="Green Acres Lawn Care"
              defaultValue={step1.businessName}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Business phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(555) 000-0000"
              defaultValue={step1.phone}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone *</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={step1.timezone || "America/New_York"}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="serviceRadius">Service radius (miles)</Label>
            <Input
              id="serviceRadius"
              name="serviceRadius"
              type="number"
              min={1}
              placeholder="25"
              defaultValue={step1.serviceRadius}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Services ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick the services you offer. You can customise them later in Settings.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SERVICES.map((service) => {
              const selected = selectedServices.includes(service)
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {selected && <Check className="mr-1 inline h-3 w-3" />}
                  {service}
                </button>
              )
            })}
          </div>
          {selectedServices.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      )}

      {/* ── Step 3: Working Hours ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="workdayStart">Start time</Label>
              <Input
                id="workdayStart"
                name="workdayStart"
                type="time"
                defaultValue={step3.workdayStart}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workdayEnd">End time</Label>
              <Input
                id="workdayEnd"
                name="workdayEnd"
                type="time"
                defaultValue={step3.workdayEnd}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Work days</Label>
            <div className="flex gap-2">
              {DAYS.map((day) => {
                const active = workDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-9 w-10 rounded-md border text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {day.slice(0, 2)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: First Client ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Skip this — you can add clients any time from the Clients page.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientFirstName">First name</Label>
              <Input id="clientFirstName" name="clientFirstName" placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientLastName">Last name</Label>
              <Input id="clientLastName" name="clientLastName" placeholder="Smith" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientPhone">Phone</Label>
            <Input
              id="clientPhone"
              name="clientPhone"
              type="tel"
              placeholder="(555) 000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientAddress">Service address</Label>
            <Input
              id="clientAddress"
              name="clientAddress"
              placeholder="123 Main St, Anytown, ST 00000"
            />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {state && !state.success && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {isLastStep ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Setting up your account…" : "Go to Dashboard"}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  )
}
