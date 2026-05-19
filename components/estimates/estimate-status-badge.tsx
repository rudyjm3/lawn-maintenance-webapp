import { Badge } from "@/components/ui/badge"
import { type EstimateStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<EstimateStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
  expired: {
    label: "Expired",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  },
}

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}
