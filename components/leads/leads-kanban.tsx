"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, ArrowRight, Pencil } from "lucide-react"
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

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "site_visit", label: "Site Visit" },
  { status: "estimate_sent", label: "Estimate Sent" },
  { status: "won", label: "Won" },
  { status: "lost", label: "Lost" },
]

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  new: "contacted",
  contacted: "site_visit",
  site_visit: "estimate_sent",
  estimate_sent: "won",
}

const NEXT_LABEL: Partial<Record<LeadStatus, string>> = {
  new: "Contacted",
  contacted: "Site Visit",
  site_visit: "Estimate Sent",
  estimate_sent: "Won",
}

const STATUS_OPTIONS: { label: string; value: LeadStatus }[] = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Site Visit", value: "site_visit" },
  { label: "Estimate Sent", value: "estimate_sent" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
]

const COLUMN_HEADER_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  site_visit: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  estimate_sent: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  lost: "bg-muted text-muted-foreground",
}

function LeadCard({
  lead,
  isPending,
  onStatusChange,
  onConvert,
}: {
  lead: Lead
  isPending: boolean
  onStatusChange: (id: string, status: LeadStatus) => void
  onConvert: (id: string, name: string) => void
}) {
  const nextStatus = NEXT_STATUS[lead.status]
  const nextLabel = NEXT_LABEL[lead.status]

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5 shadow-sm">
      <div>
        <p className="font-medium text-sm text-foreground leading-tight">{lead.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(lead.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {(lead.phone || lead.email) && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {lead.phone && <p>{lead.phone}</p>}
          {lead.email && <p className="truncate">{lead.email}</p>}
        </div>
      )}

      {lead.service_address && (
        <p className="text-xs text-muted-foreground truncate">{lead.service_address}</p>
      )}

      {lead.source && (
        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {lead.source}
        </span>
      )}

      <div className="flex items-center gap-1.5 pt-0.5">
        {nextStatus && nextLabel && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 flex-1 min-w-0"
            disabled={isPending}
            onClick={() => onStatusChange(lead.id, nextStatus)}
          >
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{nextLabel}</span>
          </Button>
        )}

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {lead.converted_client_id ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap" title="Already converted to client">
              <UserPlus className="inline h-3 w-3 mr-1 opacity-40" />
              {new Date(lead.converted_at!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ) : (lead.status === "estimate_sent" || lead.status === "won") ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1"
              disabled={isPending}
              onClick={() => onConvert(lead.id, lead.name)}
              title="Convert to client"
            >
              <UserPlus className="h-3 w-3" />
            </Button>
          ) : null}

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
            <DropdownMenuContent align="end">
              {STATUS_OPTIONS.map(({ label, value }) => (
                <DropdownMenuItem key={value} onClick={() => onStatusChange(lead.id, value as LeadStatus)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export function LeadsKanban({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(leadId: string, status: LeadStatus) {
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, status)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
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
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
      {COLUMNS.map(({ status, label }) => {
        const columnLeads = leads.filter((l) => l.status === status)
        return (
          <div key={status} className="min-w-[260px] w-[280px] shrink-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  COLUMN_HEADER_COLORS[status],
                )}
              >
                {columnLeads.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {columnLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No leads</p>
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isPending={isPending}
                    onStatusChange={handleStatusChange}
                    onConvert={handleConvert}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
