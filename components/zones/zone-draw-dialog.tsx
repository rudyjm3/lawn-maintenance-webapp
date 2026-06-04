"use client"

import { useState, useEffect, useTransition } from "react"
import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { createZone, updateZone } from "@/app/actions/zones"
import type { ServiceZone } from "@/types"

const ZoneMapLeaflet = dynamic(
  () => import("@/components/zones/zone-map-leaflet"),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse rounded" /> },
)

// toLeaflet: [lng,lat] GeoJSON → [lat,lng] Leaflet
const toLeaflet = ([lng, lat]: [number, number]): [number, number] => [lat, lng]
// toGeoJSON: [lat,lng] Leaflet → [lng,lat] GeoJSON
const toGeoJSON = ([lat, lng]: [number, number]): [number, number] => [lng, lat]

interface ZoneDrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingZone: ServiceZone | null
  allZones: ServiceZone[]
  defaultCenter: [number, number]
  onSaved: () => void
}

export function ZoneDrawDialog({
  open,
  onOpenChange,
  editingZone,
  allZones,
  defaultCenter,
  onSaved,
}: ZoneDrawDialogProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState("#22c55e")
  const [description, setDescription] = useState("")
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Initialize form when dialog opens or editingZone changes
  useEffect(() => {
    if (!open) return
    if (editingZone) {
      setName(editingZone.name)
      setColor(editingZone.color)
      setDescription(editingZone.description ?? "")
      setDrawnPolygon(
        editingZone.polygon_geojson
          ? editingZone.polygon_geojson.map(toLeaflet)
          : null,
      )
    } else {
      setName("")
      setColor("#22c55e")
      setDescription("")
      setDrawnPolygon(null)
    }
    setIsDrawing(false)
  }, [open, editingZone])

  function handleSave() {
    if (!name.trim()) {
      toast.error("Zone name is required.")
      return
    }

    const geoJsonPolygon = drawnPolygon ? drawnPolygon.map(toGeoJSON) : null

    startTransition(async () => {
      const values = {
        name: name.trim(),
        color,
        description: description.trim() || null,
        polygon_geojson: geoJsonPolygon,
      }

      const result = editingZone
        ? await updateZone({ ...values, id: editingZone.id })
        : await createZone(values)

      if (result.success) {
        toast.success(result.message)
        onSaved()
        onOpenChange(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  // Zones to show as background (exclude the one being edited)
  const backgroundZones = allZones.filter((z) => z.id !== editingZone?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[90vw] p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row h-[600px]">
          {/* Map panel */}
          <div className="flex-1 min-h-[300px] sm:min-h-0">
            <ZoneMapLeaflet
              center={defaultCenter}
              existingZones={backgroundZones}
              drawnPolygon={drawnPolygon}
              isDrawing={isDrawing}
              onPolygonChange={setDrawnPolygon}
              onDrawingStateChange={setIsDrawing}
            />
          </div>

          {/* Form panel */}
          <div className="w-full sm:w-72 shrink-0 border-t sm:border-t-0 sm:border-l border-border flex flex-col">
            <DialogHeader className="px-5 pt-5 pb-3">
              <DialogTitle>{editingZone ? "Edit Zone" : "New Service Zone"}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  placeholder="e.g. North Side"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                    className="h-8 w-8 rounded cursor-pointer border border-input bg-background p-0.5"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{color}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
                  rows={3}
                  placeholder="Notes about this zone…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-xs font-medium text-foreground">
                  {drawnPolygon
                    ? `Polygon drawn (${drawnPolygon.length} points)`
                    : "No polygon drawn yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use the "Start Drawing" button on the map, then click to place points. Double-click to finish.
                </p>
              </div>
            </div>

            <DialogFooter className="px-5 py-4 border-t border-border gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !name.trim()}
                className="flex-1"
              >
                {isPending ? "Saving…" : "Save Zone"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
