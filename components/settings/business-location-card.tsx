"use client"

import { useState, useTransition } from "react"
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveBusinessLocation, type BusinessLocationActionState } from "@/app/actions/settings"
import type { BusinessLocation } from "@/types"

interface BusinessLocationCardProps {
  current: BusinessLocation
}

export function BusinessLocationCard({ current }: BusinessLocationCardProps) {
  const [value, setValue] = useState(current.operating_location ?? "")
  const [result, setResult] = useState<BusinessLocationActionState | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveBusinessLocation({ operating_location: value })
      setResult(res)
    })
  }

  const hasCoords = current.operating_lat != null && current.operating_lng != null

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Operating Location</p>
          <p className="text-xs text-muted-foreground">
            Your operating city or area (e.g. &ldquo;Austin, TX&rdquo;). Used as the default map center
            when no properties have been geocoded yet.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="operating_location" className="text-xs">City / area</Label>
          <Input
            id="operating_location"
            type="text"
            placeholder="e.g. Austin, TX"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {hasCoords && !result && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Geocoded to {current.operating_lat!.toFixed(4)}, {current.operating_lng!.toFixed(4)}
          </p>
        )}

        {result && (
          <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
            !result.success
              ? "bg-destructive/10 text-destructive"
              : result.geocoded
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          }`}>
            {!result.success || !result.geocoded ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            {result.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending || value.trim() === ""}>
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isPending ? "Saving…" : "Save Location"}
          </Button>
        </div>
      </form>
    </div>
  )
}
