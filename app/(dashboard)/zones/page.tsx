import { createClient } from "@/lib/supabase/server"
import { ZonesPanel } from "@/components/zones/zones-panel"
import type { ServiceZone, Property } from "@/types"

export const metadata = { title: "Service Zones" }

export default async function ZonesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [zonesResult, propertiesResult] = await Promise.all([
    db.from("service_zones").select("*").order("name"),
    db
      .from("properties")
      .select("id, address, lat, lng, zone_id, client_id, is_commercial, client:clients(name)")
      .order("address"),
  ])

  const zones = (zonesResult.data ?? []) as ServiceZone[]
  const properties = (propertiesResult.data ?? []) as Property[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Service Zones</h1>
        <p className="text-sm text-muted-foreground">
          Draw territory boundaries on the map, then assign properties to zones for route clustering.
        </p>
      </div>

      <ZonesPanel zones={zones} properties={properties} />
    </div>
  )
}
