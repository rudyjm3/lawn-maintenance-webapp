import { JobsTable } from "@/components/jobs/jobs-table"
import { normalizeJobRows } from "@/lib/jobs"
import { createClient } from "@/lib/supabase/server"
import type { Client, Job, Property } from "@/types"

export const metadata = { title: "Jobs" }

interface PageProps {
  searchParams: Promise<{ new?: string; client?: string }>
}

export default async function JobsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [jobsResult, clientsResult, propertiesResult] = await Promise.all([
    db
      .from("jobs")
      .select("*, client:clients(*), property:properties(*), property_service:property_services(*, service_type:service_types(*))")
      .order("created_at", { ascending: false }),
    db.from("clients").select("*").order("name", { ascending: true }),
    db.from("properties").select("*").order("address", { ascending: true }),
  ])

  const jobs = normalizeJobRows((jobsResult.data ?? []) as Record<string, unknown>[]) as Job[]
  const clients = (clientsResult.data ?? []) as Client[]
  const properties = (propertiesResult.data ?? []) as Property[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Manage scheduled and unscheduled work across all properties.
        </p>
      </div>

      <JobsTable
        jobs={jobs}
        clients={clients}
        properties={properties}
        initialOpenNew={params.new === "1"}
        initialClientId={params.client}
      />
    </div>
  )
}
