import { createClient } from "@/lib/supabase/server"
import { ServiceTypesTable } from "@/components/service-catalog/service-types-table"
import { ServiceTemplatesTable } from "@/components/service-catalog/service-templates-table"
import type { ServiceType, ServiceTemplate } from "@/types"

export const metadata = { title: "Services" }

export default async function ServiceCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === "templates" ? "templates" : "types"

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [typesResult, templatesResult] = await Promise.all([
    db.from("service_types").select("*").order("name", { ascending: true }),
    db
      .from("service_templates")
      .select("*, service_type:service_types(id, name, default_duration_min, default_price, is_recurring, is_seasonal)")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  const serviceTypes = (typesResult.data ?? []) as ServiceType[]
  const templates = (templatesResult.data ?? []) as ServiceTemplate[]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the service types and reusable templates your business offers
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {(["types", "templates"] as const).map((t) => {
          const labels = { types: "Service Types", templates: "Templates" }
          const counts = { types: serviceTypes.length, templates: templates.length }
          return (
            <a
              key={t}
              href={t === "types" ? "/service-catalog" : "/service-catalog?tab=templates"}
              className={[
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {labels[t]}
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  activeTab === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {counts[t]}
              </span>
            </a>
          )
        })}
      </div>

      {activeTab === "types" ? (
        <ServiceTypesTable serviceTypes={serviceTypes} />
      ) : (
        <ServiceTemplatesTable templates={templates} serviceTypes={serviceTypes} />
      )}
    </div>
  )
}
