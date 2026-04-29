"use client"

import { startTransition, useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { updateJobSchedule, rescheduleJobsForDate } from "@/app/actions/jobs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatLocalDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { CapacityBar } from "./capacity-bar"
import { JobChip } from "./job-chip"
import type { Job, WeekDaySnapshot } from "@/types"
import type { DayWeather } from "@/lib/weather"

const CAPACITY_MIN = 480

interface WeekPlannerProps {
  initialDays: WeekDaySnapshot[]
  initialUnscheduled: Job[]
  weatherByDate?: Record<string, DayWeather>
}

function isoDate(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return formatLocalDate(d)
}

function buildWeekDays(anchor: Date, allJobs: Job[]): WeekDaySnapshot[] {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const todayStr = formatLocalDate(new Date())

  return Array.from({ length: 7 }, (_, i) => {
    const date = isoDate(anchor, i)
    const jobs = allJobs.filter((job) => job.service_date === date && job.status !== "cancelled")
    const scheduledMinutes = jobs.reduce((sum, job) => sum + job.estimated_duration_min, 0)
    const dateObject = new Date(`${date}T12:00:00`)

    return {
      date,
      label: dayLabels[dateObject.getDay()],
      isToday: date === todayStr,
      jobCount: jobs.length,
      scheduledMinutes,
      capacityMinutes: CAPACITY_MIN,
      isOverbooked: scheduledMinutes > CAPACITY_MIN,
      jobs,
    }
  })
}

// ─── Weather reschedule inline UI ────────────────────────────────────────────

function WeatherReschedulePanel({
  fromDate,
  onDone,
}: {
  fromDate: string
  onDone: () => void
}) {
  const [toDate, setToDate] = useState("")
  const [isPending, startReschedule] = useTransition()
  const router = useRouter()

  function handleReschedule() {
    if (!toDate) return
    startReschedule(async () => {
      const result = await rescheduleJobsForDate(fromDate, toDate)
      if (result.success) {
        toast.success(result.message)
        onDone()
        startTransition(() => router.refresh())
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-lg dark:border-amber-800 dark:bg-amber-950/80">
      <p className="mb-2 text-xs font-medium text-amber-900 dark:text-amber-200">
        Move all jobs to:
      </p>
      <div className="flex gap-1.5">
        <input
          type="date"
          value={toDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setToDate(e.target.value)}
          className="flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 dark:bg-amber-950 dark:border-amber-700"
        />
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleReschedule}
          disabled={!toDate || isPending}
        >
          {isPending ? "Moving…" : "Move"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={onDone}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Day column header ────────────────────────────────────────────────────────

function DayHeader({
  day,
  weather,
}: {
  day: WeekDaySnapshot
  weather?: DayWeather
}) {
  const [showReschedule, setShowReschedule] = useState(false)
  const showWeatherAlert =
    weather &&
    (weather.severity === "rain" || weather.severity === "severe") &&
    day.jobs.length > 0

  return (
    <div
      className={cn(
        "relative flex items-center justify-between rounded-t-xl px-3 py-2",
        day.isToday ? "bg-primary/10" : "bg-muted/40",
        day.isOverbooked && "bg-destructive/10",
        showWeatherAlert && !day.isOverbooked && "bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <div>
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-xs font-semibold",
              day.isToday ? "text-primary" : "text-foreground",
              day.isOverbooked && "text-destructive",
            )}
          >
            {day.label}
          </p>
          {weather && weather.severity !== "clear" && (
            <span title={weather.label} className="text-[13px] leading-none">
              {weather.icon}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        {day.isOverbooked && (
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
            Over
          </Badge>
        )}
        {showWeatherAlert && (
          <button
            onClick={() => setShowReschedule((v) => !v)}
            className="text-[10px] font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
          >
            {weather!.severity === "severe" ? "⛈️ Reschedule" : "🌧️ Reschedule"}
          </button>
        )}
      </div>

      {showReschedule && (
        <WeatherReschedulePanel
          fromDate={day.date}
          onDone={() => setShowReschedule(false)}
        />
      )}
    </div>
  )
}

// ─── Main planner ─────────────────────────────────────────────────────────────

export function WeekPlanner({ initialDays, initialUnscheduled, weatherByDate = {} }: WeekPlannerProps) {
  const router = useRouter()
  const [allJobs, setAllJobs] = useState<Job[]>([
    ...initialDays.flatMap((day) => day.jobs),
    ...initialUnscheduled,
  ])
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const days = buildWeekDays(weekAnchor, allJobs)
  const unscheduled = allJobs.filter((job) => !job.service_date)

  function prevWeek() {
    setWeekAnchor((date) => {
      const next = new Date(date)
      next.setDate(next.getDate() - 7)
      return next
    })
  }

  function nextWeek() {
    setWeekAnchor((date) => {
      const next = new Date(date)
      next.setDate(next.getDate() + 7)
      return next
    })
  }

  function goToday() {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0, 0, 0, 0)
    setWeekAnchor(d)
  }

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    setDraggingJobId(jobId)
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, date: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTargetDate(date)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetDate: string | null) => {
      e.preventDefault()
      if (!draggingJobId || isSaving) return

      const movingJob = allJobs.find((job) => job.id === draggingJobId)
      if (!movingJob || movingJob.service_date === targetDate) {
        setDraggingJobId(null)
        setDropTargetDate(null)
        return
      }

      const previousJobs = allJobs
      setAllJobs((prev) =>
        prev.map((job) =>
          job.id === draggingJobId
            ? { ...job, service_date: targetDate, status: targetDate ? "scheduled" : "unscheduled" }
            : job,
        ),
      )
      setDraggingJobId(null)
      setDropTargetDate(null)
      setIsSaving(true)

      const result = await updateJobSchedule(draggingJobId, targetDate)
      setIsSaving(false)
      if (!result.success) {
        setAllJobs(previousJobs)
        toast.error(result.message)
        return
      }
      toast.success(targetDate ? "Job scheduled." : "Job moved to unscheduled.")

      startTransition(() => {
        router.refresh()
      })
    },
    [allJobs, draggingJobId, isSaving, router],
  )

  const handleDragEnd = useCallback(() => {
    setDraggingJobId(null)
    setDropTargetDate(null)
  }, [])

  const endAnchor = new Date(weekAnchor)
  endAnchor.setDate(endAnchor.getDate() + 6)
  const rangeLabel = `${weekAnchor.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${endAnchor.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium text-foreground">{rangeLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setSidebarOpen((value) => !value)}
          >
            <span>{unscheduled.length}</span> Unscheduled
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => router.push("/jobs?new=1")}
            disabled={isSaving}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Job
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {days.map((day) => {
            const isDropTarget = dropTargetDate === day.date
            const weather = weatherByDate[day.date]

            return (
              <div
                key={day.date}
                onDragOver={(e) => handleDragOver(e, day.date)}
                onDrop={(e) => void handleDrop(e, day.date)}
                onDragLeave={() => setDropTargetDate(null)}
                className={cn(
                  "flex min-w-[120px] flex-1 flex-col rounded-xl border bg-card transition-colors",
                  day.isToday ? "border-primary/50" : "border-border",
                  isDropTarget && "border-primary bg-primary/5 ring-1 ring-primary",
                  day.isOverbooked && !isDropTarget && "border-destructive/40",
                  weather?.severity === "severe" && !isDropTarget && !day.isOverbooked && "border-amber-300 dark:border-amber-700",
                )}
              >
                <DayHeader day={day} weather={weather} />

                <div className="px-3 pt-2">
                  <CapacityBar
                    scheduledMinutes={day.scheduledMinutes}
                    capacityMinutes={CAPACITY_MIN}
                  />
                </div>

                <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
                  {isDropTarget && draggingJobId && (
                    <p className="rounded border border-dashed border-primary/40 bg-primary/5 px-2 py-1 text-center text-[11px] text-primary">
                      Drop to schedule on {day.label}
                    </p>
                  )}
                  {day.jobs.length === 0 && !isDropTarget && (
                    <p className="pt-2 text-center text-[11px] text-muted-foreground/50">
                      No jobs
                    </p>
                  )}
                  {day.jobs.map((job) => (
                    <JobChip
                      key={job.id}
                      job={job}
                      draggable={!isSaving}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {sidebarOpen && (
          <div
            className="flex w-52 shrink-0 flex-col rounded-xl border border-border bg-card"
            onDragOver={(e) => handleDragOver(e, null)}
            onDrop={(e) => void handleDrop(e, null)}
            onDragLeave={() => setDropTargetDate(null)}
          >
            <div
              className={cn(
                "flex items-center justify-between rounded-t-xl border-b border-border bg-muted/40 px-3 py-2",
                dropTargetDate === null && draggingJobId && "bg-primary/10",
              )}
            >
              <p className="text-xs font-semibold text-foreground">
                Unscheduled
                {unscheduled.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                    {unscheduled.length}
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
              {dropTargetDate === null && draggingJobId && (
                <p className="rounded border border-dashed border-primary/40 bg-primary/5 px-2 py-1 text-center text-[11px] text-primary">
                  Drop here to unschedule
                </p>
              )}
              {unscheduled.length === 0 && (
                <p className="pt-4 text-center text-xs text-muted-foreground">
                  All jobs have dates
                </p>
              )}
              {unscheduled.map((job) => (
                <JobChip
                  key={job.id}
                  job={job}
                  draggable={!isSaving}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>

            <div className="border-t border-border p-2">
              <p className="text-center text-[11px] leading-tight text-muted-foreground">
                {isSaving ? "Saving schedule update..." : "Drag a job onto a day to schedule it"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
