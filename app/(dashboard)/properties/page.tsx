import { createClient } from "@/lib/supabase/server"
import { PropertiesTable } from "@/components/properties/properties-table"
import type { Client, Property } from "@/types"

export const metadata = { title: "Properties" }

export default async function PropertiesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [propertiesResult, clientsResult] = await Promise.all([
    db.from("properties").select("*, client:clients(*)").order("address"),
    db.from("clients").select("id, name").order("name"),
  ])

  const properties = (propertiesResult.data ?? []) as Property[]
  const clients = (clientsResult.data ?? []) as Client[]

  const commercialCount = properties.filter((p) => p.is_commercial).length
  const residentialCount = properties.filter((p) => !p.is_commercial).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Properties</h1>
        <p className="text-sm text-muted-foreground">
          {properties.length} total · {residentialCount} residential
          {commercialCount > 0 && ` · ${commercialCount} commercial`}
        </p>
      </div>

      <PropertiesTable properties={properties} clients={clients} />
    </div>
  )
}
