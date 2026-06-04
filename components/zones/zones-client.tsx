"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ZoneDrawDialog } from "@/components/zones/zone-draw-dialog"
import { deleteZone } from "@/app/actions/zones"
import { toast } from "sonner"
import type { ServiceZone } from "@/types"
import { useRouter } from "next/navigation"

interface ZonesClientProps {
  zones: ServiceZone[]
  defaultCenter: [number, number]
}

export function ZonesClient({ zones, defaultCenter }: ZonesClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleNew() {
    setEditingZone(null)
    setDialogOpen(true)
  }

  function handleEdit(zone: ServiceZone) {
    setEditingZone(zone)
    setDialogOpen(true)
  }

  function handleDelete(zone: ServiceZone) {
    if (!confirm(`Delete zone "${zone.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteZone(zone.id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  function handleSaved() {
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Draw New Zone
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
            <p className="text-sm font-medium text-foreground">No service zones yet</p>
            <p className="text-xs text-muted-foreground">
              Draw geographic territories to cluster jobs and cut drive time.
            </p>
            <Button variant="outline" size="sm" onClick={handleNew} className="mt-2 gap-1.5">
              <Plus className="h-4 w-4" />
              Draw your first zone
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Color</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Map
                </th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr
                  key={zone.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{zone.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-5 rounded-full border border-border/60 shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                        {zone.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {zone.description ? (
                      <span className="text-muted-foreground line-clamp-1 max-w-[240px]">
                        {zone.description}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {zone.polygon_geojson ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mapped
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">No polygon</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(zone)}
                        disabled={isPending}
                        aria-label="Edit zone"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(zone)}
                        disabled={isPending}
                        aria-label="Delete zone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ZoneDrawDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingZone={editingZone}
        allZones={zones}
        defaultCenter={defaultCenter}
        onSaved={handleSaved}
      />
    </>
  )
}
