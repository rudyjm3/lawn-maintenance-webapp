import { Badge } from "@/components/ui/badge"
import { type InvoiceStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  partial: {
    label: "Partial",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
  void: {
    label: "Void",
    className: "bg-muted text-muted-foreground/60",
  },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
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
