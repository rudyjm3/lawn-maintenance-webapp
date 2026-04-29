"use client"

import { useState, useTransition } from "react"
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { geocodeAllProperties } from "@/app/actions/properties"
import type { BulkGeocodeState } from "@/app/actions/properties"

interface GeocodePropertiesCardProps {
  total: number
  ungeocoded: number
  configured: boolean
}

export function GeocodePropertiesCard({ total, ungeocoded, configured }: GeocodePropertiesCardProps) {
  const [result, setResult] = useState<BulkGeocodeState | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRun() {
    startTransition(async () => {
      const res = await geocodeAllProperties()
      setResult(res)
    })
  }

  const allGeocoded = ungeocoded === 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Property Coordinates</p>
          <p className="text-xs text-muted-foreground">
            Route maps require lat/lng for each property. Geocoding converts street addresses
            automatically using your configured API key.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm border-t border-border pt-4">
        <div>
          <span className="text-muted-foreground">Total properties </span>
          <span className="font-semibold">{total}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Missing coordinates </span>
          <span className={`font-semibold ${ungeocoded > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {ungeocoded}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Geocoding API </span>
          <span className={`font-semibold ${configured ? "text-emerald-600" : "text-destructive"}`}>
            {configured ? "Configured" : "Not configured"}
          </span>
        </div>
      </div>

      {result && (
        <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
          result.failed > 0 && result.geocoded === 0
            ? "bg-destructive/10 text-destructive"
            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}>
          {result.failed > 0 && result.geocoded === 0 ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          {result.message}
        </div>
      )}

      <div className="flex justify-end">
        {allGeocoded && !result ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            All properties have coordinates
          </p>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRun}
            disabled={pending || !configured || allGeocoded}
          >
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {pending ? "Geocoding…" : `Geocode ${ungeocoded} propert${ungeocoded === 1 ? "y" : "ies"}`}
          </Button>
        )}
      </div>
    </div>
  )
}
