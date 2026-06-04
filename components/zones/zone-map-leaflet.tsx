"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import type { ServiceZone } from "@/types"

// Coordinate conversion helpers
const toLeaflet = ([lng, lat]: [number, number]): [number, number] => [lat, lng]
const toGeoJSON = ([lat, lng]: [number, number]): [number, number] => [lng, lat]

interface ZoneMapLeafletProps {
  center: [number, number]
  existingZones: ServiceZone[]
  drawnPolygon: [number, number][] | null  // [lat, lng] Leaflet order
  isDrawing: boolean
  onPolygonChange: (polygon: [number, number][]) => void
  onDrawingStateChange: (isDrawing: boolean) => void
}

function ExistingZonePolygons({ zones }: { zones: ServiceZone[] }) {
  const map = useMap()

  useEffect(() => {
    const layers: L.Polygon[] = zones
      .filter((z) => z.polygon_geojson && z.polygon_geojson.length >= 3)
      .map((z) => {
        const latLngs = (z.polygon_geojson as [number, number][]).map(toLeaflet)
        const poly = L.polygon(latLngs, {
          fillColor: z.color,
          fillOpacity: 0.25,
          color: z.color,
          weight: 2,
        })
        poly.bindTooltip(z.name, { permanent: false, direction: "center" })
        poly.addTo(map)
        return poly
      })

    return () => {
      layers.forEach((l) => map.removeLayer(l))
    }
  }, [map, zones])

  return null
}

function DrawnPolygonLayer({
  polygon,
  isDrawing,
}: {
  polygon: [number, number][] | null
  isDrawing: boolean
}) {
  const map = useMap()
  const polyRef = useRef<L.Polygon | null>(null)

  useEffect(() => {
    if (isDrawing) return // Don't render finalized polygon while actively drawing
    if (polyRef.current) {
      map.removeLayer(polyRef.current)
      polyRef.current = null
    }
    if (polygon && polygon.length >= 3) {
      polyRef.current = L.polygon(polygon, {
        fillColor: "#16a34a",
        fillOpacity: 0.2,
        color: "#16a34a",
        weight: 2,
        dashArray: "4 4",
      }).addTo(map)
    }
    return () => {
      if (polyRef.current) {
        map.removeLayer(polyRef.current)
        polyRef.current = null
      }
    }
  }, [map, polygon, isDrawing])

  return null
}

function PolygonDrawer({
  isDrawing,
  onPolygonChange,
  onDrawingStateChange,
}: {
  isDrawing: boolean
  onPolygonChange: (polygon: [number, number][]) => void
  onDrawingStateChange: (isDrawing: boolean) => void
}) {
  const map = useMap()
  const verticesRef = useRef<[number, number][]>([])
  const markersRef = useRef<L.CircleMarker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)

  function clearTemp() {
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }
    verticesRef.current = []
  }

  function updatePolyline(vertices: [number, number][]) {
    if (polylineRef.current) map.removeLayer(polylineRef.current)
    if (vertices.length >= 2) {
      polylineRef.current = L.polyline(vertices, {
        color: "#16a34a",
        weight: 2,
        dashArray: "4 4",
      }).addTo(map)
    }
  }

  useEffect(() => {
    if (!isDrawing) {
      clearTemp()
      map.getContainer().style.cursor = ""
      map.doubleClickZoom.enable()
      return
    }

    map.getContainer().style.cursor = "crosshair"
    map.doubleClickZoom.disable()

    function handleClick(e: L.LeafletMouseEvent) {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng]
      verticesRef.current = [...verticesRef.current, latlng]

      const dot = L.circleMarker(latlng, {
        radius: 5,
        fillColor: "#16a34a",
        fillOpacity: 1,
        color: "#fff",
        weight: 1.5,
      }).addTo(map)
      markersRef.current = [...markersRef.current, dot]

      updatePolyline(verticesRef.current)
    }

    function handleDblClick(e: L.LeafletMouseEvent) {
      L.DomEvent.stop(e)
      if (verticesRef.current.length >= 3) {
        const finalPoly = [...verticesRef.current]
        clearTemp()
        onPolygonChange(finalPoly)
        onDrawingStateChange(false)
      }
    }

    map.on("click", handleClick)
    map.on("dblclick", handleDblClick)

    return () => {
      map.off("click", handleClick)
      map.off("dblclick", handleDblClick)
      map.getContainer().style.cursor = ""
      map.doubleClickZoom.enable()
      clearTemp()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isDrawing])

  return null
}

export default function ZoneMapLeaflet({
  center,
  existingZones,
  drawnPolygon,
  isDrawing,
  onPolygonChange,
  onDrawingStateChange,
}: ZoneMapLeafletProps) {
  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ExistingZonePolygons zones={existingZones} />
        <DrawnPolygonLayer polygon={drawnPolygon} isDrawing={isDrawing} />
        <PolygonDrawer
          isDrawing={isDrawing}
          onPolygonChange={onPolygonChange}
          onDrawingStateChange={onDrawingStateChange}
        />
      </MapContainer>

      {/* Drawing controls overlaid on map */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 1000, display: "flex", gap: 4 }}>
        {!isDrawing ? (
          <button
            onClick={() => {
              onDrawingStateChange(true)
            }}
            style={{
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            {drawnPolygon ? "Redraw" : "Start Drawing"}
          </button>
        ) : (
          <button
            onClick={() => {
              onDrawingStateChange(false)
            }}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {isDrawing && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 11,
            pointerEvents: "none",
          }}
        >
          Click to add points · Double-click to finish
        </div>
      )}
    </div>
  )
}

// Re-export helpers so the dialog can use them
export { toLeaflet, toGeoJSON }
