import { cn } from "@/lib/utils"

interface CapacityBarProps {
  scheduledMinutes: number
  capacityMinutes: number
  showLabel?: boolean
}

export function CapacityBar({ scheduledMinutes, capacityMinutes, showLabel = true }: CapacityBarProps) {
  const safeCapacity = Math.max(1, capacityMinutes)
  const pct = Math.min(100, Math.round((scheduledMinutes / safeCapacity) * 100))
  const isOverbooked = scheduledMinutes > safeCapacity
  const h = Math.floor(scheduledMinutes / 60)
  const m = scheduledMinutes % 60

  return (
    <div className="w-full space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className={cn("font-medium", isOverbooked ? "text-destructive" : "text-muted-foreground")}>
            {h}h{m > 0 ? ` ${m}m` : ""}
          </span>
          <span className={cn(isOverbooked ? "text-destructive font-semibold" : "text-muted-foreground")}>
            {isOverbooked ? `+${Math.round((scheduledMinutes - safeCapacity) / 60 * 10) / 10}h over` : `${pct}%`}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOverbooked ? "bg-destructive" : pct > 75 ? "bg-amber-400" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
