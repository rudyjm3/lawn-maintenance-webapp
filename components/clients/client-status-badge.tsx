import { Badge } from "@/components/ui/badge"
import { type ClientStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  lead: {
    label: "Lead",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  inactive: {
    label: "Inactive",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground",
  },
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  )
}
