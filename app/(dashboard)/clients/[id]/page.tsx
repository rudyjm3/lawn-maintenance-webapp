import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Phone,
  Mail,
  PlusCircle,
  Receipt,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs"
import { mockClients, mockProperties, mockJobs } from "@/lib/mock-data"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const client = mockClients.find((c) => c.id === id)
  return { title: client?.name ?? "Client" }
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params

  // TODO: Replace with real Supabase queries
  const client = mockClients.find((c) => c.id === id)
  if (!client) notFound()

  const properties = mockProperties.filter((p) => p.client_id === id)
  const jobs = mockJobs.filter((j) => j.client_id === id)

  return (
    <div className="space-y-6">
      {/* ── Back nav ── */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Clients
      </Link>

      {/* ── Client header card ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: name + metadata */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">
                {client.name}
              </h1>
              <ClientStatusBadge status={client.status} />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {client.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </span>
              )}
              {properties.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {properties.length} propert{properties.length !== 1 ? "ies" : "y"}
                </span>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {client.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${client.phone}`}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Call
                </a>
              </Button>
            )}
            {client.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${client.email}`}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Email
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/jobs?client=${id}&new=1`}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add Job
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/invoices?client=${id}&new=1`}>
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                Invoice
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabbed detail ── */}
      <ClientDetailTabs client={client} properties={properties} jobs={jobs} />
    </div>
  )
}
