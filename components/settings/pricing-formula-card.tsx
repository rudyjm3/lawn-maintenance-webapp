"use client"

import { useState, useTransition } from "react"
import { DollarSign } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { savePricingSettings } from "@/app/actions/settings"
import { type PricingSettings } from "@/types"

interface Props {
  settings: PricingSettings
}

export function PricingFormulaCard({ settings }: Props) {
  const [values, setValues] = useState<PricingSettings>(settings)
  const [isPending, startTransition] = useTransition()

  function set(key: keyof PricingSettings, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw === "" ? "" : Number(raw) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await savePricingSettings(values)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <DollarSign className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Price Calculator Formula</p>
          <p className="text-xs text-muted-foreground">
            These defaults pre-fill the Price Calculator when creating estimates. Adjust them to
            match your crew&apos;s actual production rates and costs.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 border-t border-border pt-5">
        {/* Production rate */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Production Rate
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Sq ft mowed per minute</Label>
              <Input
                type="number"
                min="1"
                step="10"
                value={values.pricing_sqft_per_min}
                onChange={(e) => set("pricing_sqft_per_min", e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Default 400 ≈ 12,000 sq ft in 30 min
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default crew rate ($/hr)</Label>
              <Input
                type="number"
                min="1"
                step="5"
                value={values.pricing_default_crew_rate}
                onChange={(e) => set("pricing_default_crew_rate", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Complexity multipliers */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Complexity Multipliers
          </p>
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                { key: "pricing_complexity_easy_mult", label: "Easy" },
                { key: "pricing_complexity_normal_mult", label: "Normal" },
                { key: "pricing_complexity_difficult_mult", label: "Difficult" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.05"
                  value={values[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Multiplied against base mow time. Normal = 1.0× (no change).
          </p>
        </div>

        {/* Add-on times */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Service Add-on Times
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Edging add-on (min)</Label>
              <Input
                type="number"
                min="0"
                max="120"
                step="1"
                value={values.pricing_edge_add_min}
                onChange={(e) => set("pricing_edge_add_min", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Blowing add-on (min)</Label>
              <Input
                type="number"
                min="0"
                max="120"
                step="1"
                value={values.pricing_blow_add_min}
                onChange={(e) => set("pricing_blow_add_min", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Price range */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Price Range
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Range band (±%)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                step="1"
                value={values.pricing_range_pct}
                onChange={(e) => set("pricing_range_pct", e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Shown as low/high around the midpoint price
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
