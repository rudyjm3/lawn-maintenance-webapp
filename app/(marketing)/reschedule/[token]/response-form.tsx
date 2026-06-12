"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ResponseFormProps {
  token: string
  proposedDate: string
  businessPhone: string | null
  alreadyResponded: boolean
  initialStatus: string
  initialChosenDate: string | null
}

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  })
}

export function ResponseForm({
  token,
  proposedDate,
  businessPhone,
  alreadyResponded,
  initialStatus,
  initialChosenDate,
}: ResponseFormProps) {
  const [status, setStatus] = useState(initialStatus)
  const [chosenDate, setChosenDate] = useState(initialChosenDate ?? "")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isPending, startTransition] = useTransition()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().slice(0, 10)

  function respond(action: "confirm" | "alternative", date?: string) {
    startTransition(async () => {
      const res = await fetch("/api/reschedule/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, date }),
      })
      const json = await res.json()
      if (json.success) {
        setStatus(action === "confirm" ? "confirmed" : "alternative_requested")
        if (date) setChosenDate(date)
      } else {
        toast.error(json.error ?? "Something went wrong.")
      }
    })
  }

  if (status === "confirmed") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-2">
        <p className="text-2xl">✅</p>
        <p className="font-semibold text-green-800">You're all set!</p>
        <p className="text-sm text-green-700">We've confirmed your service for <strong>{fmt(proposedDate)}</strong>. See you then!</p>
      </div>
    )
  }

  if (status === "alternative_requested") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center space-y-2">
        <p className="text-2xl">📅</p>
        <p className="font-semibold text-blue-800">Request received!</p>
        <p className="text-sm text-blue-700">
          We've received your request for <strong>{chosenDate ? fmt(chosenDate) : "an alternative date"}</strong>.
          Our team will confirm availability and follow up shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
        disabled={isPending || alreadyResponded}
        onClick={() => respond("confirm")}
      >
        {isPending ? "Confirming…" : `✅ Yes, ${fmt(proposedDate)} works`}
      </Button>

      {!showDatePicker && (
        <Button
          variant="outline"
          className="w-full h-12 text-base"
          disabled={isPending || alreadyResponded}
          onClick={() => setShowDatePicker(true)}
        >
          📅 Request a different date
        </Button>
      )}

      {showDatePicker && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Pick your preferred date:</p>
          <input
            type="date"
            min={minDate}
            value={chosenDate}
            onChange={(e) => setChosenDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowDatePicker(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={!chosenDate || isPending}
              onClick={() => respond("alternative", chosenDate)}
            >
              {isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </div>
        </div>
      )}

      {businessPhone && (
        <Button variant="ghost" className="w-full h-12 text-base text-muted-foreground" asChild>
          <a href={`tel:${businessPhone}`}>📞 Call us: {businessPhone}</a>
        </Button>
      )}
    </div>
  )
}
