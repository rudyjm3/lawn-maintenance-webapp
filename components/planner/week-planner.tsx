"use client"

import { startTransition, useCallback, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { updateJobSchedule, rescheduleJobsForDate } from "@/app/actions/jobs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { formatLocalDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { CapacityBar } from "./capacity-bar"
import { JobChip } from "./job-chip"
import { BalancingSuggestionsDialog } from "./balancing-suggestions-dialog"
import type { Job, WeekDaySnapshot } from "@/types"
import type { DayWeather } from "@/lib/weather"

const CAPACITY_MIN = 480

interface WeekPlannerProps {
  initialDays: WeekDaySnapshot[]
  initialUnscheduled: Job[]
  weatherByDate?: Record<string, DayWeather>
  initialDate?: string
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
    const jobs = allJobs
      .filter((job) => job.service_date === date && job.status !== "cancelled")
      .sort((a, b) => {
        const aOrder = a.route_stops?.[0]?.stop_order ?? Infinity
        const bOrder = b.route_stops?.[0]?.stop_order ?? Infinity
        return aOrder - bOrder
      })
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

// ─── Weather reschedule dialog ────────────────────────────────────────────────

function WeatherRescheduleDialog({
  fromDate,
  open,
  onOpenChange,
}: {
  fromDate: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [toDate, setToDate] = useState("")
  const [isPending, startReschedule] = useTransition()
  const router = useRouter()

  const fromLabel = new Date(`${fromDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  function handleReschedule() {
    if (!toDate) return
    startReschedule(async () => {
      const result = await rescheduleJobsForDate(fromDate, toDate)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        startTransition(() => router.refresh())
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reschedule due to weather</DialogTitle>
          <DialogDescription>
            Move all jobs from{" "}
            <span className="font-medium text-foreground">{fromLabel}</span> to a new date.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <input
            type="date"
            value={toDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={handleReschedule} disabled={!toDate || isPending}>
            {isPending ? "Moving…" : "Move Jobs"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
        "flex items-center justify-between rounded-t-xl px-3 py-2",
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
            onClick={() => setShowReschedule(true)}
            className="text-[10px] font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
          >
            {weather!.severity === "severe" ? "⛈️ Reschedule" : "🌧️ Reschedule"}
          </button>
        )}
      </div>

      <WeatherRescheduleDialog
        fromDate={day.date}
        open={showReschedule}
        onOpenChange={setShowReschedule}
      />
    </div>
  )
}

// ─── Main planner ─────────────────────────────────────────────────────────────

export function WeekPlanner({ initialDays, initialUnscheduled, weatherByDate = {}, initialDate }: WeekPlannerProps) {
  const router = useRouter()
  const [allJobs, setAllJobs] = useState<Job[]>([
    ...initialDays.flatMap((day) => day.jobs),
    ...initialUnscheduled,
  ])
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => {
    const base = initialDate ? new Date(`${initialDate}T12:00:00`) : new Date()
    const day = base.getDay()
    base.setDate(base.getDate() - (day === 0 ? 6 : day - 1))
    base.setHours(0, 0, 0, 0)
    return base
  })
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null)
  const draggingJobIdRef = useRef<string | null>(null)
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
    draggingJobIdRef.current = jobId
    setDraggingJobId(jobId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", jobId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, date: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTargetDate(date)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetDate: string | null) => {
      e.preventDefault()
      const jobId = draggingJobIdRef.current || e.dataTransfer.getData("text/plain")
      if (!jobId || isSaving) return

      const movingJob = allJobs.find((job) => job.id === jobId)
      if (!movingJob || movingJob.service_date === targetDate) {
        draggingJobIdRef.current = null
        setDraggingJobId(null)
        setDropTargetDate(null)
        return
      }

      const previousJobs = allJobs
      setAllJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, service_date: targetDate, status: targetDate ? "scheduled" : "unscheduled" }
            : job,
        ),
      )
      draggingJobIdRef.current = null
      setDraggingJobId(null)
      setDropTargetDate(null)
      setIsSaving(true)

      const result = await updateJobSchedule(jobId, targetDate)
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
    [allJobs, isSaving, router],
  )

  const handleDragEnd = useCallback(() => {
    draggingJobIdRef.current = null
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
          <Button variant="outline" size="icon" className="h-8 w-8 bg-muted/60 hover:bg-muted" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs bg-muted/60 hover:bg-muted" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-muted/60 hover:bg-muted" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium text-foreground">{rangeLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          <BalancingSuggestionsDialog weekStart={formatLocalDate(weekAnchor)} />
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
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDropTargetDate(null)
                  }
                }}
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
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDropTargetDate(null)
              }
            }}
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
              {dropTargetDate === null && draggingJobId &&
                allJobs.some((j) => j.id === draggingJobId && j.service_date) && (
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
