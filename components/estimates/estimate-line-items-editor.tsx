"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type ServiceType } from "@/types"

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
      <div className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 px-1 text-xs font-medium text-muted-foreground">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit Price</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {fields.map((field, i) => {
        const qty = Number(items[i]?.qty ?? 1)
        const unitPrice = Number(items[i]?.unit_price ?? 0)
        const lineTotal = qty * unitPrice

        return (
          <div key={field.id} className="grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 items-start">
            <div className="space-y-1">
              {serviceTypes.length > 0 && (
                <Select
                  onValueChange={(val) => handleServiceTypeChange(i, val)}
                  defaultValue=""
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Quick-fill from service…" />
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
              <Input
                {...register(`items.${i}.description`)}
                placeholder="Description"
                className="h-8 text-sm"
              />
            </div>
            <Input
              {...register(`items.${i}.qty`)}
              type="number"
              min="0.01"
              step="0.01"
              className="h-8 text-sm"
            />
            <Input
              {...register(`items.${i}.unit_price`)}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="h-8 text-sm"
            />
            <div className="h-8 flex items-center justify-end text-sm font-medium tabular-nums">
              ${lineTotal.toFixed(2)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
              disabled={fields.length === 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8 mt-1"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Line Item
      </Button>
    </div>
  )
}
