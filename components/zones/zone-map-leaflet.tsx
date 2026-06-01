"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import type { ServiceZone, Property } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoneMapProps {
  zones: ServiceZone[]
  properties: Property[]
  selectedZoneId: string | null
  drawingZoneId: string | null
  onPolygonComplete: (zoneId: string, coords: [number, number][]) => void
  onAssignProperty: (propertyId: string, zoneId: string | null) => void
}

// ─── Polygon overlays ─────────────────────────────────────────────────────────

function ZonePolygons({
  zones,
  selectedZoneId,
}: {
  zones: ServiceZone[]
  selectedZoneId: string | null
}) {
  const map = useMap()
  const layersRef = useRef<L.Polygon[]>([])

  useEffect(() => {
    layersRef.current.forEach((l) => map.removeLayer(l))
    layersRef.current = []

    for (const zone of zones) {
      if (!zone.coordinates || zone.coordinates.length < 3) continue
      const isSelected = zone.id === selectedZoneId
      const poly = L.polygon(zone.coordinates as L.LatLngExpression[], {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: isSelected ? 0.35 : 0.2,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: undefined,
      })
      poly.bindTooltip(zone.name, { sticky: true })
      poly.addTo(map)
      layersRef.current.push(poly)
    }

    return () => {
      layersRef.current.forEach((l) => map.removeLayer(l))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, zones, selectedZoneId])

  return null
}

// ─── Property markers ─────────────────────────────────────────────────────────

function PropertyMarkers({
  properties,
  zones,
  selectedZoneId,
  onAssignProperty,
}: {
  properties: Property[]
  zones: ServiceZone[]
  selectedZoneId: string | null
  onAssignProperty: (propertyId: string, zoneId: string | null) => void
}) {
  const map = useMap()
  const markersRef = useRef<L.CircleMarker[]>([])
  const zoneColorMap = Object.fromEntries(zones.map((z) => [z.id, z.color]))

  useEffect(() => {
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    const mapped = properties.filter((p) => p.lat != null && p.lng != null)
    for (const prop of mapped) {
      const color = prop.zone_id ? (zoneColorMap[prop.zone_id] ?? "#6b7280") : "#6b7280"
      const marker = L.circleMarker([prop.lat!, prop.lng!], {
        radius: 7,
        color: "#fff",
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      })
      marker.bindTooltip(
        `<strong>${prop.address}</strong>${prop.client ? `<br/>${prop.client.name}` : ""}`,
        { direction: "top", offset: [0, -10] },
      )
      marker.on("click", () => {
        if (selectedZoneId) {
          const newZoneId = prop.zone_id === selectedZoneId ? null : selectedZoneId
          onAssignProperty(prop.id, newZoneId)
        }
      })
      marker.addTo(map)
      markersRef.current.push(marker)
    }

    return () => {
      markersRef.current.forEach((m) => map.removeLayer(m))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, properties, zones, selectedZoneId])

  return null
}

// ─── Drawing mode ─────────────────────────────────────────────────────────────

function DrawingLayer({
  drawingZoneId,
  zone,
  onVertexAdded,
  vertices,
}: {
  drawingZoneId: string
  zone: ServiceZone | undefined
  onVertexAdded: (lat: number, lng: number) => void
  vertices: [number, number][]
}) {
  const map = useMap()
  const previewRef = useRef<L.Polyline | null>(null)
  const dotRefs = useRef<L.CircleMarker[]>([])

  useMapEvents({
    click(e) {
      onVertexAdded(e.latlng.lat, e.latlng.lng)
    },
  })

  useEffect(() => {
    if (previewRef.current) map.removeLayer(previewRef.current)
    dotRefs.current.forEach((d) => map.removeLayer(d))
    dotRefs.current = []

    if (vertices.length === 0) return

    const color = zone?.color ?? "#22c55e"

    // Draw vertex dots
    for (const v of vertices) {
      const dot = L.circleMarker(v as L.LatLngExpression, {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 1,
        weight: 1,
      })
      dot.addTo(map)
      dotRefs.current.push(dot)
    }

    // Draw preview polyline
    if (vertices.length > 1) {
      previewRef.current = L.polyline(vertices as L.LatLngExpression[], {
        color,
        weight: 2,
        dashArray: "6 4",
        opacity: 0.8,
      })
      previewRef.current.addTo(map)
    }

    return () => {
      if (previewRef.current) map.removeLayer(previewRef.current)
      dotRefs.current.forEach((d) => map.removeLayer(d))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, vertices, zone])

  // Change cursor in draw mode
  useEffect(() => {
    const container = map.getContainer()
    container.style.cursor = "crosshair"
    return () => { container.style.cursor = "" }
  }, [map])

  return null
}

// ─── Bounds fitter ────────────────────────────────────────────────────────────

function BoundsFitter({ properties }: { properties: Property[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current) return
    const pts = properties.filter((p) => p.lat != null && p.lng != null)
    if (pts.length === 0) return
    const bounds = L.latLngBounds(pts.map((p) => [p.lat!, p.lng!] as [number, number]))
    map.fitBounds(bounds, { padding: [32, 32] })
    fitted.current = true
  }, [map, properties])

  return null
}

// ─── Main exported map ────────────────────────────────────────────────────────

export default function ZoneLeafletMap({
  zones,
  properties,
  selectedZoneId,
  drawingZoneId,
  onPolygonComplete,
  onAssignProperty,
}: ZoneMapProps) {
  const [vertices, setVertices] = useState<[number, number][]>([])
  const prevDrawingId = useRef<string | null>(null)

  // Reset vertices when draw mode starts for a new zone
  useEffect(() => {
    if (drawingZoneId !== prevDrawingId.current) {
      setVertices([])
      prevDrawingId.current = drawingZoneId
    }
  }, [drawingZoneId])

  const drawingZone = drawingZoneId ? zones.find((z) => z.id === drawingZoneId) : undefined

  const center: [number, number] = (() => {
    const pts = properties.filter((p) => p.lat != null && p.lng != null)
    if (pts.length === 0) return [39.5, -98.35]
    const lat = pts.reduce((s, p) => s + p.lat!, 0) / pts.length
    const lng = pts.reduce((s, p) => s + p.lng!, 0) / pts.length
    return [lat, lng]
  })()

  function handleFinish() {
    if (drawingZoneId && vertices.length >= 3) {
      onPolygonComplete(drawingZoneId, vertices)
      setVertices([])
    }
  }

  function handleUndo() {
    setVertices((v) => v.slice(0, -1))
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <BoundsFitter properties={properties} />
        <ZonePolygons zones={zones} selectedZoneId={selectedZoneId} />
        <PropertyMarkers
          properties={properties}
          zones={zones}
          selectedZoneId={selectedZoneId}
          onAssignProperty={onAssignProperty}
        />
        {drawingZoneId && (
          <DrawingLayer
            drawingZoneId={drawingZoneId}
            zone={drawingZone}
            vertices={vertices}
            onVertexAdded={(lat, lng) => setVertices((v) => [...v, [lat, lng]])}
          />
        )}
      </MapContainer>

      {/* ── Draw mode controls overlay ── */}
      {drawingZoneId && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-md">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: drawingZone?.color ?? "#22c55e" }}
            />
            <span className="text-xs font-medium text-foreground">
              {drawingZone?.name ?? "Drawing zone"} · {vertices.length} point{vertices.length !== 1 ? "s" : ""}
              {vertices.length < 3 && " (need 3+)"}
            </span>
            <button
              onClick={handleUndo}
              disabled={vertices.length === 0}
              className="ml-1 rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              Undo
            </button>
            <button
              onClick={handleFinish}
              disabled={vertices.length < 3}
              className="rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              Finish
            </button>
          </div>
        </div>
      )}

      {/* ── Select zone hint ── */}
      {!drawingZoneId && selectedZoneId && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
            <p className="text-xs text-muted-foreground">
              Click a property pin to assign / unassign it to the selected zone
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
