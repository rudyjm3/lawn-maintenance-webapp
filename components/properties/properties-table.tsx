"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import {
  Search,
  Plus,
  KeyRound,
  PawPrint,
  Ruler,
  MapPin,
  Building2,
  Home,
  Pencil,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddPropertySheet } from "@/components/properties/add-property-sheet"
import { type Property, type Client, type ServiceZone } from "@/types"
import { assignPropertyZone } from "@/app/actions/zones"
import { cn } from "@/lib/utils"

type TypeFilter = "all" | "residential" | "commercial"

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Residential", value: "residential" },
  { label: "Commercial", value: "commercial" },
]

interface PropertiesTableProps {
  properties: Property[]
  clients: Client[]
  zones?: ServiceZone[]
}

export function PropertiesTable({ properties, clients, zones = [] }: PropertiesTableProps) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  const zoneMap = useMemo(() => {
    const m: Record<string, ServiceZone> = {}
    for (const z of zones) m[z.id] = z
    return m
  }, [zones])

  function handleZoneChange(propertyId: string, zoneId: string) {
    startTransition(async () => {
      await assignPropertyZone(propertyId, zoneId === "" ? null : zoneId)
    })
  }

  // Build a client lookup map
  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {}
    for (const c of clients) m[c.id] = c
    return m
  }, [clients])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return properties.filter((p) => {
      const client = clientMap[p.client_id]
      const matchesSearch =
        !q ||
        p.address.toLowerCase().includes(q) ||
        client?.name.toLowerCase().includes(q) ||
        p.gate_code?.includes(q) ||
        p.lawn_size?.toLowerCase().includes(q)
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "commercial" && p.is_commercial) ||
        (typeFilter === "residential" && !p.is_commercial)
      return matchesSearch && matchesType
    })
  }, [properties, search, typeFilter, clientMap])

  const residentialCount = properties.filter((p) => !p.is_commercial).length
  const commercialCount = properties.filter((p) => p.is_commercial).length

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search properties or clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setEditingProperty(undefined); setSheetOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* ── Type filter tabs ── */}
      <div className="flex gap-1 border-b border-border">
        {TYPE_FILTERS.map(({ label, value }) => {
          const count =
            value === "all"
              ? properties.length
              : value === "commercial"
                ? commercialCount
                : residentialCount
          return (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                typeFilter === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  typeFilter === value
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

      {/* ── Property cards grid ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <p className="text-sm font-medium text-foreground">
            No properties found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search
              ? "Try a different search term"
              : "Add a property to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => {
            const client = clientMap[property.client_id]
            return (
              <div
                key={property.id}
                className="group rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                {/* Address + type badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {property.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingProperty(property); setSheetOpen(true) }}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                      aria-label="Edit property"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-xs border-transparent",
                      property.is_commercial
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                    )}
                  >
                    {property.is_commercial ? (
                      <>
                        <Building2 className="mr-1 h-3 w-3" />
                        Commercial
                      </>
                    ) : (
                      <>
                        <Home className="mr-1 h-3 w-3" />
                        Residential
                      </>
                    )}
                  </Badge>
                  </div>
                </div>

                {/* Client link */}
                {client && (
                  <Link
                    href={`/clients/${client.id}`}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {client.name}
                  </Link>
                )}

                {/* Zone assignment */}
                {zones.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {property.zone_id && zoneMap[property.zone_id] && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: zoneMap[property.zone_id].color }}
                      />
                    )}
                    <select
                      value={property.zone_id ?? ""}
                      onChange={(e) => handleZoneChange(property.id, e.target.value)}
                      disabled={isPending}
                      className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                    >
                      <option value="">No zone</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Details row */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {property.lawn_size && (
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {property.lawn_size}
                    </span>
                  )}
                  {property.gate_code && (
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <KeyRound className="h-3 w-3 text-muted-foreground" />
                      {property.gate_code}
                    </span>
                  )}
                  {property.pet_notes && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <PawPrint className="h-3 w-3" />
                      Pets
                    </span>
                  )}
                </div>

                {/* Access notes */}
                {property.access_notes && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2 line-clamp-2">
                    {property.access_notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {properties.length} propert
          {properties.length !== 1 ? "ies" : "y"}
        </p>
      )}

      <AddPropertySheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingProperty(undefined) }}
        clients={clients}
        property={editingProperty}
      />
    </>
  )
}
