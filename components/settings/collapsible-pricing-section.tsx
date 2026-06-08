"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PricingFormulaCard } from "@/components/settings/pricing-formula-card"
import { type PricingSettings } from "@/types"

interface Props {
  settings: PricingSettings
}

export function CollapsiblePricingSection({ settings }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Price Calculator</h2>
          {!open && (
            <p className="text-xs text-muted-foreground mt-1">
              Configure the formula used to auto-calculate job prices based on lot size, complexity, crew rate, and service add-ons.
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen((v) => !v)} aria-label={open ? "Collapse price calculator" : "Edit price calculator"}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      {open && <PricingFormulaCard settings={settings} onSaved={() => setOpen(false)} />}
    </div>
  )
}
