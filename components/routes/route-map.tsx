"use client"

import { useEffect, useRef } from "react"
import { MapPin } from "lucide-react"

interface StopPin {
  lat: number
  lng: number
  label: string
  address: string
}

interface RouteMapProps {
  stops: StopPin[]
  className?: string
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
const IS_CONFIGURED = API_KEY && API_KEY !== "your-google-maps-api-key"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any
    _mapsReady: boolean
    _mapsCallbacks: Array<() => void>
    _onMapsLoaded: () => void
  }
}

function loadMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window._mapsReady) return Promise.resolve()

  return new Promise((resolve) => {
    if (window._mapsCallbacks) {
      window._mapsCallbacks.push(resolve)
      return
    }
    window._mapsCallbacks = [resolve]

    window._onMapsLoaded = () => {
      window._mapsReady = true
      for (const cb of window._mapsCallbacks ?? []) cb()
      window._mapsCallbacks = []
    }

    if (!document.getElementById("google-maps-script")) {
      const script = document.createElement("script")
      script.id = "google-maps-script"
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=_onMapsLoaded`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })
}

function MapPlaceholder({ message, className }: { message: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 text-center ${className}`}
    >
      <MapPin className="h-8 w-8 text-muted-foreground/40" />
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  )
}

export function RouteMap({ stops, className }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null)

  useEffect(() => {
    if (!IS_CONFIGURED || !mapRef.current) return

    loadMapsScript().then(() => {
      if (!mapRef.current || !window.google) return
      const { google } = window

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
      }

      // Clear previous markers and polyline before redrawing
      for (const m of markersRef.current) m.setMap(null)
      markersRef.current = []
      polylineRef.current?.setMap(null)
      polylineRef.current = null

      if (stops.length === 0) return

      const map = mapInstanceRef.current
      const bounds = new google.maps.LatLngBounds()
      stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))
      map.fitBounds(bounds)

      markersRef.current = stops.map((stop) =>
        new google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          label: { text: stop.label, color: "white", fontWeight: "bold", fontSize: "12px" },
          title: stop.address,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: "#16a34a",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        }),
      )

      if (stops.length > 1) {
        polylineRef.current = new google.maps.Polyline({
          path: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
          map,
          strokeColor: "#16a34a",
          strokeOpacity: 0.7,
          strokeWeight: 3,
        })
      }
    })

    return () => {
      for (const m of markersRef.current) m.setMap(null)
      markersRef.current = []
      polylineRef.current?.setMap(null)
      polylineRef.current = null
    }
  }, [stops])

  if (!IS_CONFIGURED) {
    return (
      <MapPlaceholder
        className={className}
        message={
          <>
            <p className="font-medium text-foreground">Map not configured</p>
            <p className="mt-1 text-xs">
              Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the route map.
            </p>
          </>
        }
      />
    )
  }

  if (stops.length === 0) {
    return (
      <MapPlaceholder className={className} message="Add stops to see the route map." />
    )
  }

  return <div ref={mapRef} className={`rounded-xl overflow-hidden ${className}`} />
}
