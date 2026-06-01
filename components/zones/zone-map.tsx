"use client"

import dynamic from "next/dynamic"
import type { ZoneMapProps } from "./zone-map-leaflet"

const LeafletZoneMap = dynamic(() => import("./zone-map-leaflet"), { ssr: false })

export function ZoneMap(props: ZoneMapProps) {
  return <LeafletZoneMap {...props} />
}
