import { createClient } from "@/lib/supabase/server"
import { ClientsTable } from "@/components/clients/clients-table"
import type { Client, Property } from "@/types"

export const metadata = { title: "Clients" }

export default async function ClientsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [clientsResult, propertiesResult] = await Promise.all([
    db.from("clients").select("*").order("name"),
    db.from("properties").select("id, client_id"),
  ])

  const clients = (clientsResult.data ?? []) as Client[]
  const properties = (propertiesResult.data ?? []) as Property[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {clients.length} total client{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ClientsTable clients={clients} properties={properties} />
    </div>
  )
}
