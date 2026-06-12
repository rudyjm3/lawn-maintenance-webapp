"use client"

import { useState, useMemo, useTransition } from "react"
import { Pencil, Search, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { updateLeadStatus, convertLeadToClient } from "@/app/actions/leads"
import { type LeadStatus } from "@/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  service_address: string | null
  requested_services: string[]
  status: LeadStatus
  source: string | null
  created_at: string
  converted_client_id: string | null
  converted_at: string | null
}

const STATUS_FILTERS: { label: string; value: LeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Site Visit", value: "site_visit" },
  { label: "Estimate Sent", value: "estimate_sent" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
]

const STATUS_OPTIONS: { label: string; value: LeadStatus }[] = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Site Visit", value: "site_visit" },
  { label: "Estimate Sent", value: "estimate_sent" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
]

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads.filter((l) => {
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.service_address?.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || l.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [leads, search, statusFilter])

  function handleStatusChange(leadId: string, status: LeadStatus) {
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, status)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  function handleConvert(leadId: string, name: string) {
    if (!confirm(`Convert ${name} to a client? This will create a client and property record.`)) return
    startTransition(async () => {
      const result = await convertLeadToClient(leadId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count =
            value === "all"
              ? leads.length
              : leads.filter((l) => l.status === value).length
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
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

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No leads found</p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different search term"
                : "Leads from your quote form will appear here"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Address
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">
                  Services
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Received
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  className={cn(
                    "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 === 0 ? "" : "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{lead.name}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {lead.phone && <span className="text-foreground">{lead.phone}</span>}
                      {lead.email && (
                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {lead.service_address ? (
                      <span className="text-muted-foreground line-clamp-1 max-w-[200px]">
                        {lead.service_address}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {lead.requested_services?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.requested_services.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                        {lead.requested_services.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{lead.requested_services.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Change status"
                            disabled={isPending}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {STATUS_OPTIONS.map(({ label, value }) => (
                            <DropdownMenuItem key={value} onClick={() => handleStatusChange(lead.id, value as LeadStatus)}>
                              {label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {lead.converted_client_id ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap" title="Already converted to client">
                        <UserPlus className="h-3.5 w-3.5 opacity-40 shrink-0" />
                        <span className="hidden xl:inline">
                          {new Date(lead.converted_at!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="xl:hidden">
                          {new Date(lead.converted_at!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </span>
                    ) : lead.status !== "won" && lead.status !== "lost" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1"
                        disabled={isPending}
                        onClick={() => handleConvert(lead.id, lead.name)}
                        title="Convert to client"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">Convert</span>
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {leads.length} lead
          {leads.length !== 1 ? "s" : ""}
        </p>
      )}
    </>
  )
}
