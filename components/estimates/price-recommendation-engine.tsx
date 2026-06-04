"use client"

import { useState, useMemo } from "react"
import { Calculator, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PriceResult {
  laborMin: number
  totalMin: number
  priceLow: number
  priceMid: number
  priceHigh: number
  description: string
}

type Complexity = "easy" | "normal" | "difficult"
type SizeUnit = "sqft" | "acres"

const COMPLEXITY_LABELS: Record<Complexity, string> = {
  easy: "Easy",
  normal: "Normal",
  difficult: "Difficult",
}

const COMPLEXITY_MULT: Record<Complexity, number> = {
  easy: 0.8,
  normal: 1.0,
  difficult: 1.35,
}

// Calibrated to: 12,000 sq ft lawn = 30 min base mow time
const SQ_FT_PER_MIN = 400

function calcPrice(
  sizeSqFt: number,
  complexity: Complexity,
  includeEdge: boolean,
  includeBlow: boolean,
  travelMin: number,
  crewRate: number,
): PriceResult {
  const baseMowMin = sizeSqFt / SQ_FT_PER_MIN
  const adjustedMowMin = baseMowMin * COMPLEXITY_MULT[complexity]
  const laborMin = Math.round(
    adjustedMowMin + (includeEdge ? 7 : 0) + (includeBlow ? 5 : 0),
  )
  const totalMin = laborMin + travelMin
  const priceMid = (totalMin / 60) * crewRate
  const priceLow = Math.round(priceMid * 0.9)
  const priceHigh = Math.round(priceMid * 1.1)

  const acres = (sizeSqFt / 43560).toFixed(2)
  const services = ["Mow", includeEdge && "Edge", includeBlow && "Blow"]
    .filter(Boolean)
    .join(", ")
  const description = `${services} — ${acres} ac, ${COMPLEXITY_LABELS[complexity]} terrain`

  return { laborMin, totalMin, priceLow, priceMid: Math.round(priceMid), priceHigh, description }
}

interface Props {
  onApply: (price: number, description: string, durationMin: number) => void
}

export function PriceRecommendationEngine({ onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState("")
  const [unit, setUnit] = useState<SizeUnit>("sqft")
  const [complexity, setComplexity] = useState<Complexity>("normal")
  const [includeEdge, setIncludeEdge] = useState(true)
  const [includeBlow, setIncludeBlow] = useState(true)
  const [travelMin, setTravelMin] = useState(10)
  const [crewRate, setCrewRate] = useState(90)

  const sizeSqFt = useMemo(() => {
    const n = parseFloat(size)
    if (!n || n <= 0) return 0
    return unit === "acres" ? n * 43560 : n
  }, [size, unit])

  const result = useMemo<PriceResult | null>(() => {
    if (sizeSqFt <= 0) return null
    return calcPrice(sizeSqFt, complexity, includeEdge, includeBlow, travelMin, crewRate)
  }, [sizeSqFt, complexity, includeEdge, includeBlow, travelMin, crewRate])

  function handleApply() {
    if (!result) return
    onApply(result.priceMid, result.description, result.laborMin)
    setOpen(false)
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={() => setOpen(true)}
      >
        <Calculator className="h-3.5 w-3.5" />
        Price Calculator
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Price Calculator</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get a price recommendation based on property details
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Property size */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Property Size</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={unit === "sqft" ? "e.g. 12000" : "e.g. 0.28"}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex rounded-md border border-input overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setUnit("sqft")}
                  className={`px-2.5 py-1.5 transition-colors ${
                    unit === "sqft"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  sq ft
                </button>
                <button
                  type="button"
                  onClick={() => setUnit("acres")}
                  className={`px-2.5 py-1.5 border-l border-input transition-colors ${
                    unit === "acres"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  acres
                </button>
              </div>
            </div>
            {sizeSqFt > 0 && unit === "sqft" && (
              <p className="text-xs text-muted-foreground">
                ≈ {(sizeSqFt / 43560).toFixed(3)} acres
              </p>
            )}
            {sizeSqFt > 0 && unit === "acres" && (
              <p className="text-xs text-muted-foreground">
                ≈ {sizeSqFt.toLocaleString()} sq ft
              </p>
            )}
          </div>

          {/* Complexity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Terrain Complexity</Label>
            <div className="flex gap-1.5">
              {(["easy", "normal", "difficult"] as Complexity[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setComplexity(c)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    complexity === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {COMPLEXITY_LABELS[c]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {complexity === "easy" && "Flat, open turf — few obstacles"}
              {complexity === "normal" && "Some trees, beds, or slight grade"}
              {complexity === "difficult" && "Steep slopes, dense obstacles, gates"}
            </p>
          </div>

          {/* Services */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Services Included</Label>
            <div className="flex gap-1.5">
              {[
                { label: "Mow", active: true, fixed: true },
                { label: "Edge", active: includeEdge, toggle: () => setIncludeEdge((v) => !v) },
                { label: "Blow", active: includeBlow, toggle: () => setIncludeBlow((v) => !v) },
              ].map(({ label, active, fixed, toggle }) => (
                <button
                  key={label}
                  type="button"
                  onClick={toggle}
                  disabled={fixed}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  } ${fixed ? "opacity-70 cursor-default" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Travel time + Crew rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Travel Time (min)</Label>
              <Input
                type="number"
                min="0"
                max="120"
                value={travelMin}
                onChange={(e) => setTravelMin(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Crew Rate ($/hr)</Label>
              <Input
                type="number"
                min="0"
                step="5"
                value={crewRate}
                onChange={(e) => setCrewRate(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Result */}
          {result ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">Labor time</span>
                  {result.laborMin} min
                </div>
                <div>
                  <span className="block font-medium text-foreground">Total on-site + travel</span>
                  {result.totalMin} min
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-0.5">Recommended price</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  ${result.priceLow} – ${result.priceHigh}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">per visit</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              Enter property size to see a price recommendation
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!result}
            onClick={handleApply}
          >
            Apply to Estimate
          </Button>
        </div>
      </div>
    </div>
  )
}
