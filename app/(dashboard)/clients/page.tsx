import { ClientsTable } from "@/components/clients/clients-table"
import { mockClients, mockProperties } from "@/lib/mock-data"

export const metadata = { title: "Clients" }

export default function ClientsPage() {
  // TODO: Replace with real Supabase queries
  const clients = mockClients
  const properties = mockProperties

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {clients.length} total client{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Table with search/filter/add ── */}
      <ClientsTable clients={clients} properties={properties} />
    </div>
  )
}
