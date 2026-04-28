import { Badge } from "@/components/ui/badge"
import type { JobStatus } from "@/types"

const STATUS_STYLES: Record<JobStatus, string> = {
  unscheduled: "bg-violet-100 text-violet-800 border-transparent dark:bg-violet-950/50 dark:text-violet-300",
  scheduled: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950/50 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950/50 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950/50 dark:text-emerald-300",
  skipped: "bg-muted text-muted-foreground border-transparent",
  cancelled: "bg-muted text-muted-foreground border-transparent",
}

const STATUS_LABELS: Record<JobStatus, string> = {
  unscheduled: "Unscheduled",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
  cancelled: "Cancelled",
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
