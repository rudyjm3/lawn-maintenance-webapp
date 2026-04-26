"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, RefreshCw, Leaf, Clock, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ServiceTypeSheet } from "@/components/service-catalog/service-type-sheet"
import { deleteServiceType } from "@/app/actions/service-catalog"
import type { ServiceType } from "@/types"
import { cn } from "@/lib/utils"

interface ServiceTypesTableProps {
  serviceTypes: ServiceType[]
}

export function ServiceTypesTable({ serviceTypes }: ServiceTypesTableProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceType | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!confirmDeleteId) return
    const t = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(t)
  }, [confirmDeleteId])

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setDeleting(id)
    setConfirmDeleteId(null)
    const result = await deleteServiceType(id)
    setDeleting(null)
    if (!result.success) {
      toast.error(result.message)
    } else {
      toast.success(result.message)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {serviceTypes.length} service type{serviceTypes.length !== 1 ? "s" : ""}
        </p>
        <Button
          onClick={() => {
            setEditing(undefined)
            setSheetOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {serviceTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No services yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first service type to get started
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Service
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Price
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Tags
                </th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {serviceTypes.map((st, i) => (
                <tr
                  key={st.id}
                  className={cn(
                    "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 === 0 ? "" : "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{st.name}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {st.default_duration_min} min
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    ${Number(st.default_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-1.5">
                      {st.is_recurring && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <RefreshCw className="h-3 w-3" /> Recurring
                        </Badge>
                      )}
                      {st.is_seasonal && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Leaf className="h-3 w-3" /> Seasonal
                        </Badge>
                      )}
                      {!st.is_recurring && !st.is_seasonal && (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(st)
                          setSheetOpen(true)
                        }}
                        className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                        aria-label="Edit service"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(st.id)}
                        disabled={deleting === st.id}
                        className={cn(
                          "rounded p-1 transition-all",
                          confirmDeleteId === st.id
                            ? "text-destructive opacity-100"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive",
                        )}
                        aria-label={confirmDeleteId === st.id ? "Confirm delete" : "Delete service"}
                        title={confirmDeleteId === st.id ? "Click again to confirm" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ServiceTypeSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditing(undefined)
        }}
        serviceType={editing}
      />
    </>
  )
}
