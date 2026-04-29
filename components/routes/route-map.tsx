"use client"

import dynamic from "next/dynamic"
import { MapPin } from "lucide-react"

export interface StopPin {
  lat: number
  lng: number
  label: string
  address: string
}

interface RouteMapProps {
  stops: StopPin[]
  className?: string
}

const LeafletMap = dynamic(() => import("./route-map-leaflet"), { ssr: false })

function MapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 text-center ${className ?? ""}`}
    >
      <MapPin className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Add stops to see the route map.</p>
    </div>
  )
}

export function RouteMap({ stops, className }: RouteMapProps) {
  if (stops.length === 0) {
    return <MapPlaceholder className={className} />
  }

  return (
    <div className={`overflow-hidden rounded-xl ${className ?? ""}`}>
      <LeafletMap stops={stops} className="h-full w-full" />
    </div>
  )
}
