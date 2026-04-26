import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  UserPlus,
  DollarSign,
  MessageSquarePlus,
  XCircle,
} from "lucide-react"
import type { ActivityItem } from "@/types"

const ICON_MAP = {
  job_completed: { icon: CheckCircle2, color: "text-primary bg-primary/10" },
  client_added: { icon: UserPlus, color: "text-blue-500 bg-blue-50 dark:bg-blue-950" },
  invoice_paid: { icon: DollarSign, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950" },
  lead_received: { icon: MessageSquarePlus, color: "text-violet-500 bg-violet-50 dark:bg-violet-950" },
  job_skipped: { icon: XCircle, color: "text-amber-500 bg-amber-50 dark:bg-amber-950" },
} as const

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h3>
      {items.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
          <p className="text-sm font-medium text-foreground">No recent activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Client, job, lead, and invoice activity will appear here.
          </p>
        </div>
      ) : (
      <ul className="space-y-3">
        {items.map((item) => {
          const { icon: Icon, color } = ICON_MAP[item.type]
          return (
            <li key={item.id} className="flex items-start gap-3">
              <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</p>
              </div>
            </li>
          )
        })}
      </ul>
      )}
    </div>
  )
}
