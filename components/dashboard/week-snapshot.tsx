import { cn } from "@/lib/utils"
import type { WeekDaySnapshot } from "@/types"

interface WeekSnapshotProps {
  days: WeekDaySnapshot[]
}

export function WeekSnapshot({ days }: WeekSnapshotProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">This Week</h3>
      <div className="flex gap-2">
        {days.map((day) => {
          const pct = Math.min(100, Math.round((day.scheduledMinutes / day.capacityMinutes) * 100))
          const dayOfMonth = Number.parseInt(day.date.slice(-2), 10)

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-center text-xs font-medium",
                  day.isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {day.label} {dayOfMonth}
              </span>

              <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 rounded-md transition-all",
                    day.isOverbooked
                      ? "bg-destructive/80"
                      : pct > 75
                        ? "bg-amber-400"
                        : "bg-primary/70",
                  )}
                  style={{ height: `${pct}%` }}
                />
                {day.isToday && <div className="absolute inset-0 rounded-md ring-2 ring-inset ring-primary" />}
              </div>

              {day.jobCount > 0 ? (
                <div className="flex flex-col items-center leading-none">
                  <span className="text-xs font-semibold text-foreground">{day.jobCount}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {day.jobCount === 1 ? "job" : "jobs"}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-primary/70" /> On track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-amber-400" /> &gt;75%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-destructive/80" /> Overbooked
        </span>
      </div>
    </div>
  )
}
