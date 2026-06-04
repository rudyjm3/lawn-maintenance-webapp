import { createClient } from "@/lib/supabase/server"
import { ZonesClient } from "@/components/zones/zones-client"
import type { ServiceZone } from "@/types"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Service Zones" }

const US_CENTER: [number, number] = [39.5, -98.35]

export default async function ZonesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [zonesResult, geoPropsResult] = await Promise.all([
    db
      .from("service_zones")
      .select("id, business_id, name, color, description, polygon_geojson")
      .order("created_at", { ascending: true }),
    db
      .from("properties")
      .select("lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(50),
  ])

  const zones = (zonesResult.data ?? []) as ServiceZone[]
  const geoProps = (geoPropsResult.data ?? []) as { lat: number; lng: number }[]

  let defaultCenter: [number, number] = US_CENTER
  if (geoProps.length > 0) {
    const avgLat = geoProps.reduce((s, p) => s + p.lat, 0) / geoProps.length
    const avgLng = geoProps.reduce((s, p) => s + p.lng, 0) / geoProps.length
    defaultCenter = [avgLat, avgLng]
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Service Zones</h1>
        <p className="text-sm text-muted-foreground">
          Draw geographic territories to cluster jobs and reduce drive time.
        </p>
      </div>

      <ZonesClient zones={zones} defaultCenter={defaultCenter} />
    </div>
  )
}
