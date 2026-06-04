"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ServiceType } from "@/types"
import { PriceRecommendationEngine } from "@/components/estimates/price-recommendation-engine"

interface Props {
  serviceTypes: ServiceType[]
}

export function EstimateLineItemsEditor({ serviceTypes }: Props) {
  const { register, control, watch, setValue } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  function addRow() {
    append({ service_type_id: null, description: "", qty: 1, unit_price: 0, duration_min: null })
  }

  function handleServiceTypeChange(index: number, serviceTypeId: string) {
    const st = serviceTypes.find((s) => s.id === serviceTypeId)
    if (st) {
      setValue(`items.${index}.service_type_id`, st.id)
      setValue(`items.${index}.description`, st.name)
      setValue(`items.${index}.unit_price`, st.default_price)
      setValue(`items.${index}.duration_min`, st.default_duration_min)
    } else {
      setValue(`items.${index}.service_type_id`, null)
    }
  }

  const items = watch("items") as Array<{ qty: number; unit_price: number }> ?? []

  return (
    <div className="space-y-2">
      {fields.map((field, i) => {
        const qty = Number(items[i]?.qty ?? 1)
        const unitPrice = Number(items[i]?.unit_price ?? 0)
        const lineTotal = qty * unitPrice

        return (
          <div key={field.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            {/* Quick-fill — full width, above description */}
            {serviceTypes.length > 0 && (
              <Select onValueChange={(val) => handleServiceTypeChange(i, val)} defaultValue="">
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Quick-fill from service catalog…" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="text-xs">
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Description — full width */}
            <Input
              {...register(`items.${i}.description`)}
              placeholder="Description"
              className="h-8 text-sm"
            />

            {/* Qty + Price + computed total + delete — all in one row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Qty</Label>
                <Input
                  {...register(`items.${i}.qty`)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-7 w-16 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Price</Label>
                <Input
                  {...register(`items.${i}.unit_price`)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-7 w-24 text-sm"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  ${lineTotal.toFixed(2)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={addRow}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line Item
        </Button>
        <PriceRecommendationEngine
          onApply={(price, description, durationMin) => {
            append({ service_type_id: null, description, qty: 1, unit_price: price, duration_min: durationMin })
          }}
        />
      </div>
    </div>
  )
}
