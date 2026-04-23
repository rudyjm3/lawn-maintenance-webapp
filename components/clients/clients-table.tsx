"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Plus, ChevronRight, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { AddClientSheet } from "@/components/clients/add-client-sheet"
import { type Client, type Property, type ClientStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_FILTERS: { label: string; value: ClientStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Lead", value: "lead" },
  { label: "Inactive", value: "inactive" },
  { label: "Archived", value: "archived" },
]

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  ad: "Ad",
  "walk-in": "Walk-in",
}

interface ClientsTableProps {
  clients: Client[]
  properties: Property[]
}

export function ClientsTable({ clients, properties }: ClientsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all")
  const [sheetOpen, setSheetOpen] = useState(false)

  const propertiesPerClient = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of properties) {
      map[p.client_id] = (map[p.client_id] ?? 0) + 1
    }
    return map
  }, [properties])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.billing_address?.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count =
            value === "all"
              ? clients.length
              : clients.filter((c) => c.status === value).length
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                statusFilter === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  statusFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No clients found</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Try a different search term" : "Add your first client to get started"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Properties
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">
                  Since
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const propCount = propertiesPerClient[client.id] ?? 0
                return (
                  <tr
                    key={client.id}
                    className={cn(
                      "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                      i % 2 === 0 ? "" : "bg-muted/10",
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex flex-col gap-0.5"
                      >
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {client.name}
                        </span>
                        {client.billing_address && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {client.billing_address}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {client.phone && (
                          <span className="text-foreground">{client.phone}</span>
                        )}
                        {client.email && (
                          <span className="text-xs text-muted-foreground">
                            {client.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ClientStatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {client.source ? (
                        <span className="text-muted-foreground capitalize">
                          {SOURCE_LABELS[client.source] ?? client.source}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{propCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {clients.length} client
          {clients.length !== 1 ? "s" : ""}
        </p>
      )}

      <AddClientSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
