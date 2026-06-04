"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CloudRain, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { rescheduleJobsForDate } from "@/app/actions/jobs"
import { toast } from "sonner"

export interface AffectedDay {
  date: string
  label: string
  jobCount: number
  severity: "rain" | "severe"
  icon: string
  weatherLabel: string
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function WeatherRescheduleModal({
  open,
  onOpenChange,
  affectedDays,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  affectedDays: AffectedDay[]
}) {
  const router = useRouter()
  const [targetDates, setTargetDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(affectedDays.map((d) => [d.date, nextDay(d.date)])),
  )
  const [isPending, startTransition] = useTransition()

  function handleRescheduleAll() {
    startTransition(async () => {
      let succeeded = 0
      let failed = 0
      for (const day of affectedDays) {
        const target = targetDates[day.date]
        if (!target || target === day.date) continue
        const result = await rescheduleJobsForDate(day.date, target)
        if (result.success) {
          succeeded++
        } else {
          failed++
          toast.error(`Failed to reschedule ${day.label}: ${result.message}`)
        }
      }
      if (succeeded > 0) {
        toast.success(
          `${succeeded} day${succeeded > 1 ? "s" : ""} rescheduled successfully.`,
        )
        router.refresh()
      }
      if (failed === 0) {
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule Weather-Affected Jobs</DialogTitle>
          <DialogDescription>
            Select a new date for each affected day. Only unrouted scheduled jobs will be moved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {affectedDays.map((day) => (
            <div
              key={day.date}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
            >
              <span className="text-lg">{day.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{day.label}</p>
                <p className="text-xs text-muted-foreground">
                  {day.jobCount} job{day.jobCount !== 1 ? "s" : ""} · {day.weatherLabel}
                </p>
              </div>
              <input
                type="date"
                value={targetDates[day.date] ?? nextDay(day.date)}
                min={nextDay(day.date)}
                onChange={(e) =>
                  setTargetDates((prev) => ({ ...prev, [day.date]: e.target.value }))
                }
                disabled={isPending}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleRescheduleAll} disabled={isPending}>
            {isPending ? "Rescheduling…" : "Reschedule All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WeatherAlertBanner({ affectedDays }: { affectedDays: AffectedDay[] }) {
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  if (affectedDays.length === 0 || dismissed) return null

  const totalJobs = affectedDays.reduce((sum, d) => sum + d.jobCount, 0)

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <CloudRain className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {affectedDays.length} day{affectedDays.length > 1 ? "s" : ""} with weather risk this week
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {totalJobs} job{totalJobs !== 1 ? "s" : ""} at risk —{" "}
              {affectedDays.map((d) => d.icon + " " + d.label).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60 text-xs"
            onClick={() => setModalOpen(true)}
          >
            Reschedule affected jobs
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <WeatherRescheduleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        affectedDays={affectedDays}
      />
    </>
  )
}
