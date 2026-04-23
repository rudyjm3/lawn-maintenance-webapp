import { PropertiesTable } from "@/components/properties/properties-table"
import { mockProperties, mockClients } from "@/lib/mock-data"

export const metadata = { title: "Properties" }

export default function PropertiesPage() {
  // TODO: Replace with real Supabase queries
  const properties = mockProperties
  const clients = mockClients

  const commercialCount = properties.filter((p) => p.is_commercial).length
  const residentialCount = properties.filter((p) => !p.is_commercial).length

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Properties</h1>
        <p className="text-sm text-muted-foreground">
          {properties.length} total · {residentialCount} residential
          {commercialCount > 0 && ` · ${commercialCount} commercial`}
        </p>
      </div>

      {/* ── Table with search/filter/add ── */}
      <PropertiesTable properties={properties} clients={clients} />
    </div>
  )
}
