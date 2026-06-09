"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, PenLine, MapPin, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ZoneMap } from "@/components/zones/zone-map"
import { ZoneSheet } from "@/components/zones/zone-sheet"
import { updateZone, deleteZone, assignPropertyZone } from "@/app/actions/zones"
import type { ServiceZone, Property } from "@/types"
import { cn } from "@/lib/utils"

interface ZonesPanelProps {
  zones: ServiceZone[]
  properties: Property[]
  businessCenter?: [number, number] | null
}

export function ZonesPanel({ zones, properties, businessCenter }: ZonesPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<ServiceZone | undefined>(undefined)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [drawingZoneId, setDrawingZoneId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Counts properties assigned to each zone
  function propCount(zoneId: string) {
    return properties.filter((p) => p.zone_id === zoneId).length
  }

  function handleNewZone() {
    setEditingZone(undefined)
    setSheetOpen(true)
  }

  function handleEditZone(zone: ServiceZone) {
    setEditingZone(zone)
    setSheetOpen(true)
  }

  function handleZoneCreated(zoneId: string) {
    setSelectedZoneId(zoneId)
    setDrawingZoneId(zoneId)
  }

  function handleSelectZone(zoneId: string) {
    if (drawingZoneId) return // don't switch while drawing
    setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId))
  }

  function handleStartDraw(zoneId: string) {
    setSelectedZoneId(zoneId)
    setDrawingZoneId(zoneId)
  }

  function handlePolygonComplete(zoneId: string, coords: [number, number][]) {
    setDrawingZoneId(null)
    startTransition(async () => {
      const result = await updateZone(zoneId, { coordinates: coords })
      if (!result.success) toast.error(result.message)
      else toast.success("Territory saved.")
    })
  }

  function handleAssignProperty(propertyId: string, zoneId: string | null) {
    startTransition(async () => {
      const result = await assignPropertyZone(propertyId, zoneId)
      if (!result.success) toast.error(result.message)
      else toast.success(result.message)
    })
  }

  function handleDeleteZone(zone: ServiceZone) {
    if (!confirm(`Delete zone "${zone.name}"? Properties in this zone will be unassigned.`)) return
    startTransition(async () => {
      const result = await deleteZone(zone.id)
      if (!result.success) toast.error(result.message)
      else {
        toast.success(result.message)
        if (selectedZoneId === zone.id) setSelectedZoneId(null)
        if (drawingZoneId === zone.id) setDrawingZoneId(null)
      }
    })
  }

  const geocodedCount = properties.filter((p) => p.lat != null && p.lng != null).length

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[500px] gap-0 rounded-xl border border-border overflow-hidden">
      {/* ── Zone list panel ── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {zones.length} zone{zones.length !== 1 ? "s" : ""}
          </p>
          <Button size="sm" onClick={handleNewZone} disabled={isPending}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Zone
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">No zones yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a zone, then draw its territory on the map.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {zones.map((zone) => {
                const count = propCount(zone.id)
                const isSelected = selectedZoneId === zone.id
                const isDrawing = drawingZoneId === zone.id
                const hasPolygon = zone.coordinates && zone.coordinates.length >= 3

                return (
                  <li key={zone.id}>
                    <div
                      role="button"
                      tabIndex={!!drawingZoneId && !isDrawing ? -1 : 0}
                      onClick={() => handleSelectZone(zone.id)}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); handleSelectZone(zone.id) } }}
                      aria-pressed={isSelected}
                      aria-disabled={!!drawingZoneId && !isDrawing}
                      className={cn(
                        "group w-full cursor-pointer px-4 py-3 text-left transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                        !!drawingZoneId && !isDrawing && "opacity-40 cursor-not-allowed pointer-events-none",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="flex-1 truncate text-sm font-medium text-foreground">
                          {zone.name}
                        </span>
                        {isSelected && !isDrawing && (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 pl-5">
                        <span className="text-xs text-muted-foreground">
                          {count} propert{count !== 1 ? "ies" : "y"}
                        </span>
                        {hasPolygon && (
                          <span className="text-xs text-emerald-600">Territory set</span>
                        )}
                      </div>

                      {/* Zone actions */}
                      <div
                        className="mt-2 flex items-center gap-1 pl-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleStartDraw(zone.id)}
                          disabled={!!drawingZoneId}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                          title={hasPolygon ? "Redraw territory" : "Draw territory"}
                        >
                          <PenLine className="h-3 w-3" />
                          {isDrawing ? "Drawing…" : hasPolygon ? "Redraw" : "Draw territory"}
                        </button>
                        <button
                          onClick={() => handleEditZone(zone)}
                          disabled={!!drawingZoneId}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                          aria-label="Edit zone"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone)}
                          disabled={isPending || !!drawingZoneId}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                          aria-label="Delete zone"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {geocodedCount < properties.length && (
          <div className="border-t border-border px-4 py-2">
            <p className="text-xs text-muted-foreground">
              {geocodedCount} of {properties.length} properties geocoded
            </p>
          </div>
        )}
      </div>

      {/* ── Map panel ── */}
      <div className="flex-1 overflow-hidden">
        <ZoneMap
          zones={zones}
          properties={properties}
          selectedZoneId={selectedZoneId}
          drawingZoneId={drawingZoneId}
          onPolygonComplete={handlePolygonComplete}
          onAssignProperty={handleAssignProperty}
          businessCenter={businessCenter}
        />
      </div>

      <ZoneSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        zone={editingZone}
        onCreated={handleZoneCreated}
      />
    </div>
  )
}
