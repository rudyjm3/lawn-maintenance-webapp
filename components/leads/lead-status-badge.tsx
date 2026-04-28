import { Badge } from "@/components/ui/badge"
import { type LeadStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  contacted: {
    label: "Contacted",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
  },
  site_visit: {
    label: "Site Visit",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  },
  estimate_sent: {
    label: "Estimate Sent",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
  },
  won: {
    label: "Won",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  lost: {
    label: "Lost",
    className: "bg-muted text-muted-foreground",
  },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}
