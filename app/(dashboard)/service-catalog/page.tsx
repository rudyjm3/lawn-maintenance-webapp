import { createClient } from "@/lib/supabase/server"
import { ServiceTypesTable } from "@/components/service-catalog/service-types-table"
import type { ServiceType } from "@/types"

export const metadata = { title: "Services" }

export default async function ServiceCatalogPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: serviceTypes } = await db
    .from("service_types")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the service types your business offers
        </p>
      </div>
      <ServiceTypesTable serviceTypes={(serviceTypes ?? []) as ServiceType[]} />
    </div>
  )
}
