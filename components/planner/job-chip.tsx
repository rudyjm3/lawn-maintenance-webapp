"use client"

import { cn } from "@/lib/utils"
import { getJobServiceLabel } from "@/lib/jobs"
import type { Job } from "@/types"

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-200",
  in_progress: "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200",
  completed: "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300 opacity-70",
  skipped: "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-900 dark:border-gray-700 line-through",
  unscheduled: "bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-950 dark:border-violet-700 dark:text-violet-200",
  cancelled: "bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-900 line-through opacity-60",
}

interface JobChipProps {
  job: Job
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, jobId: string) => void
  onDragEnd?: () => void
  compact?: boolean
}

export function JobChip({
  job,
  draggable = false,
  onDragStart,
  onDragEnd,
  compact = false,
}: JobChipProps) {
  const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.scheduled
  const durationH = Math.floor(job.estimated_duration_min / 60)
  const durationM = job.estimated_duration_min % 60
  const durationLabel =
    durationH > 0 ? `${durationH}h${durationM > 0 ? ` ${durationM}m` : ""}` : `${durationM}m`

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, job.id) : undefined}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-md border px-2 py-1 text-xs cursor-default select-none transition-opacity",
        draggable && "cursor-grab active:cursor-grabbing hover:opacity-90",
        style,
      )}
    >
      <p className="truncate font-medium leading-tight">{job.client?.name ?? "Unknown client"}</p>
      {!compact && (
        <p className="truncate leading-tight opacity-80">
          {getJobServiceLabel(job)} - {durationLabel}
        </p>
      )}
    </div>
  )
}
