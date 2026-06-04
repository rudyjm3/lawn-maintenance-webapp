"use client"

import { useState, useTransition } from "react"
import { DollarSign, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { savePricingSettings } from "@/app/actions/settings"
import { type PricingSettings, DEFAULT_PRICING_SETTINGS } from "@/types"

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

  function handleReset() {
    setValues(DEFAULT_PRICING_SETTINGS)
    startTransition(async () => {
      const result = await savePricingSettings(DEFAULT_PRICING_SETTINGS)
      if (result.success) {
        toast.success("Reset to industry standards.")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <DollarSign className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Price Calculator Formula</p>
          <p className="text-xs text-muted-foreground">
            The Price Calculator uses these values when you create an estimate. The formula is:
          </p>
          <div className="mt-2 rounded-md bg-muted/50 border border-border px-3 py-2 font-mono text-xs text-foreground">
            <span className="text-muted-foreground">Base mow time</span> = sq&nbsp;ft ÷ sq&nbsp;ft&nbsp;per&nbsp;min
            <br />
            <span className="text-muted-foreground">Labor time</span> = base&nbsp;mow × complexity&nbsp;mult + add-ons
            <br />
            <span className="text-muted-foreground">Price</span> = (labor&nbsp;+&nbsp;travel) ÷ 60 × crew&nbsp;rate
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            <strong className="text-foreground">Example:</strong> 12,000 sq ft ÷ 400 = 30 min base mow. Normal terrain
            (1.0×) + Edge (7 min) + Blow (5 min) = 42 min labor. Add 10 min travel = 52 min total.
            52 ÷ 60 × $90/hr = <strong className="text-foreground">$78 midpoint</strong>, shown
            as $70–$86 at ±10%.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 border-t border-border pt-5">

        {/* Production rate */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Production Rate
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How fast your crew mows and what you charge per hour. These two values drive the base
              price before any complexity or add-ons.
            </p>
          </div>
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
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li>Walk-behind (21″): ~<strong className="text-foreground">300–350</strong></li>
                <li>Mid-size rider (42–48″): ~<strong className="text-foreground">400–500</strong></li>
                <li>Zero-turn (60″+): ~<strong className="text-foreground">600–800</strong></li>
              </ul>
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
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li>1-person crew: ~<strong className="text-foreground">$50–$75/hr</strong></li>
                <li>2-person crew: ~<strong className="text-foreground">$80–$120/hr</strong></li>
                <li>3-person crew: ~<strong className="text-foreground">$120–$180/hr</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Complexity multipliers */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Complexity Multipliers
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied to the base mow time to account for how terrain and obstacles slow your crew
              down. <strong className="text-foreground">Normal = 1.0×</strong> (no change). Values
              above 1.0 increase time; below 1.0 decrease it.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                {
                  key: "pricing_complexity_easy_mult",
                  label: "Easy",
                  hint: "Flat, open turf, no obstacles. e.g. 0.8× means the job goes 20% faster than normal.",
                },
                {
                  key: "pricing_complexity_normal_mult",
                  label: "Normal",
                  hint: "Some trees, beds, or a slight grade. Keep this at 1.0 as your baseline.",
                },
                {
                  key: "pricing_complexity_difficult_mult",
                  label: "Difficult",
                  hint: "Steep slopes, dense beds, gates, or many obstacles. e.g. 1.35× adds 35% more time.",
                },
              ] as const
            ).map(({ key, label, hint }) => (
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
                <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add-on times */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Service Add-on Times
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Extra minutes added to labor time when Edging or Blowing are included in the service.
              These are added after the complexity multiplier is applied.
            </p>
          </div>
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
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li>Small lot (&lt;0.25 ac): ~<strong className="text-foreground">5–7 min</strong></li>
                <li>Medium lot (0.25–0.5 ac): ~<strong className="text-foreground">7–12 min</strong></li>
                <li>Large lot (0.5–1 ac): ~<strong className="text-foreground">12–20 min</strong></li>
              </ul>
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
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li>Small lot (&lt;0.25 ac): ~<strong className="text-foreground">3–5 min</strong></li>
                <li>Medium lot (0.25–0.5 ac): ~<strong className="text-foreground">5–8 min</strong></li>
                <li>Large lot (0.5–1 ac): ~<strong className="text-foreground">8–12 min</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Price range */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Price Range Band
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The calculator shows a low–high range around the calculated midpoint, giving you
              flexibility when quoting. A wider band gives more room to adjust; a narrower band
              keeps quotes more precise.
            </p>
          </div>
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
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li>±5% on $60 → <strong className="text-foreground">$57–$63</strong> (tight)</li>
                <li>±10% on $60 → <strong className="text-foreground">$54–$66</strong> (standard)</li>
                <li>±20% on $60 → <strong className="text-foreground">$48–$72</strong> (wide)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleReset}
            disabled={isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to industry standards
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  )
}
