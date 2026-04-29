"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

interface StopPin {
  lat: number
  lng: number
  label: string
  address: string
}

function MapController({ stops }: { stops: StopPin[] }) {
  const map = useMap()

  useEffect(() => {
    if (stops.length === 0) return
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [32, 32] })
  }, [map, stops])

  return null
}

function NumberedMarkers({ stops }: { stops: StopPin[] }) {
  const map = useMap()

  useEffect(() => {
    const markers: L.Marker[] = stops.map((stop) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${stop.label}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker([stop.lat, stop.lng], { icon })
      marker.bindTooltip(stop.address, { direction: "top", offset: [0, -16] })
      marker.addTo(map)
      return marker
    })

    return () => {
      markers.forEach((m) => map.removeLayer(m))
    }
  }, [map, stops])

  return null
}

interface LeafletMapProps {
  stops: StopPin[]
  className?: string
}

export default function LeafletMap({ stops, className }: LeafletMapProps) {
  const line = stops.map((s) => [s.lat, s.lng] as [number, number])
  const center: [number, number] =
    stops.length > 0
      ? [stops[0].lat, stops[0].lng]
      : [39.5, -98.35] // center of US as fallback

  return (
    <MapContainer
      center={center}
      zoom={12}
      className={className}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController stops={stops} />
      <NumberedMarkers stops={stops} />
      {line.length > 1 && (
        <Polyline
          positions={line}
          pathOptions={{ color: "#16a34a", weight: 3, opacity: 0.7 }}
        />
      )}
    </MapContainer>
  )
}
